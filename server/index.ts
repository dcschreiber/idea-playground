import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Paths to data files
const IDEAS_FILE = path.join(__dirname, '../data/ideas.json');
const DIMENSIONS_FILE = path.join(__dirname, '../data/dimensions.json');

// Helper function to read JSON file
async function readJsonFile(filepath: string) {
  try {
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filepath}:`, error);
    throw error;
  }
}

// Helper function to write JSON file
async function writeJsonFile(filepath: string, data: any) {
  try {
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filepath}:`, error);
    throw error;
  }
}

// Routes

// Get all ideas
app.get('/api/ideas', async (req, res) => {
  try {
    const ideasData = await readJsonFile(IDEAS_FILE);
    res.json(ideasData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read ideas' });
  }
});

// Get dimensions
app.get('/api/dimensions', async (req, res) => {
  try {
    const dimensionsData = await readJsonFile(DIMENSIONS_FILE);
    res.json(dimensionsData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read dimensions' });
  }
});

// Save idea (create or update)
app.post('/api/ideas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ideaData = req.body;
    
    const ideasData = await readJsonFile(IDEAS_FILE);
    ideasData.ideas[id] = ideaData;
    
    await writeJsonFile(IDEAS_FILE, ideasData);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save idea' });
  }
});


// Create new idea
app.post('/api/ideas', async (req, res) => {
  try {
    const ideaData = req.body;
    
    const ideasData = await readJsonFile(IDEAS_FILE);
    const newId = `idea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    ideasData.ideas[newId] = ideaData;
    ideasData.metadata.total_ideas = Object.keys(ideasData.ideas).length;
    
    await writeJsonFile(IDEAS_FILE, ideasData);
    res.json({ success: true, id: newId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

// Delete idea
app.delete('/api/ideas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const ideasData = await readJsonFile(IDEAS_FILE);
    delete ideasData.ideas[id];
    ideasData.metadata.total_ideas = Object.keys(ideasData.ideas).length;
    
    await writeJsonFile(IDEAS_FILE, ideasData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

// Update idea order (for drag and drop)
app.post('/api/ideas/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body;
    
    const ideasData = await readJsonFile(IDEAS_FILE);
    
    // Update order property for each idea
    orderedIds.forEach((id: string, index: number) => {
      if (ideasData.ideas[id]) {
        ideasData.ideas[id].order = index + 1;
      }
    });
    
    await writeJsonFile(IDEAS_FILE, ideasData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder ideas' });
  }
});

// Validate title uniqueness
app.get('/api/ideas/validate-title', async (req, res) => {
  try {
    const { title, excludeId } = req.query;
    
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title parameter is required' });
    }
    
    const ideasData = await readJsonFile(IDEAS_FILE);
    const titleLower = title.trim().toLowerCase();
    
    // Check if title exists (case-insensitive), excluding the specified ID if provided
    const conflictingEntry = Object.entries(ideasData.ideas).find(([id, idea]: [string, any]) => {
      return id !== excludeId && idea.title.toLowerCase() === titleLower;
    });
    
    if (conflictingEntry) {
      res.json({ 
        isUnique: false, 
        conflictingId: conflictingEntry[0],
        conflictingTitle: conflictingEntry[1].title
      });
    } else {
      res.json({ isUnique: true });
    }
  } catch (error) {
    console.error('Error validating title:', error);
    res.status(500).json({ error: 'Failed to validate title' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
}); 