import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as cors from 'cors';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// CORS middleware
const corsHandler = cors({ origin: true });

// Type definitions
interface Idea {
  title: string;
  content: string;
  dimensions: {
    field: string;
    readiness: number;
    complexity: number;
    potentially_connected_idea: {
      idea: string;
      relation_strength: number;
    } | null;
  };
  sub_ideas: string[];
  order: number;
  createdAt?: any;
  updatedAt?: any;
}

interface DimensionsRegistry {
  dimensions_registry: {
    core_dimensions: {
      max_dimensions: number;
      fields: string[];
    };
    readiness_scale: {
      levels: number;
      labels: string[];
    };
    complexity_scale: {
      levels: number;
      labels: string[];
    };
  };
}

// Helper function to wrap Firebase Functions with CORS
function withCors(handler: (req: any, res: any) => Promise<void>) {
  return (req: any, res: any) => {
    return corsHandler(req, res, () => handler(req, res));
  };
}

// GET /ideas - Get all ideas
export const getIdeas = onRequest(withCors(async (req, res) => {
  try {
    const ideasCollection = db.collection('ideas');
    const snapshot = await ideasCollection.orderBy('order').get();
    
    const ideas: Record<string, Idea> = {};
    snapshot.forEach((doc) => {
      ideas[doc.id] = doc.data() as Idea;
    });

    res.json({ ideas });
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
}));

// GET /dimensions - Get dimensions registry
export const getDimensions = onRequest(withCors(async (req, res) => {
  try {
    const dimensionsDoc = await db.collection('config').doc('dimensions').get();
    
    if (!dimensionsDoc.exists) {
      // Return default dimensions if not found
      const defaultDimensions: DimensionsRegistry = {
        dimensions_registry: {
          core_dimensions: {
            max_dimensions: 4,
            fields: ["technology", "business", "research", "personal"]
          },
          readiness_scale: {
            levels: 5,
            labels: ["idea", "concept", "prototype", "beta", "production"]
          },
          complexity_scale: {
            levels: 5,
            labels: ["trivial", "easy", "medium", "hard", "expert"]
          }
        }
      };
      res.json(defaultDimensions);
    } else {
      res.json(dimensionsDoc.data() as DimensionsRegistry);
    }
  } catch (error) {
    console.error('Error fetching dimensions:', error);
    res.status(500).json({ error: 'Failed to fetch dimensions' });
  }
}));

// POST /ideas - Create new idea
export const createIdea = onRequest(withCors(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const ideaData = req.body;
    
    // Validate title uniqueness
    const existingIdeas = await db.collection('ideas').where('title', '==', ideaData.title).get();
    if (!existingIdeas.empty) {
      res.status(400).json({ error: 'Title already exists' });
      return;
    }

    // Get next order number
    const allIdeas = await db.collection('ideas').orderBy('order', 'desc').limit(1).get();
    const nextOrder = allIdeas.empty ? 1 : (allIdeas.docs[0].data().order + 1);

    // Add timestamps and order
    const newIdea: Idea = {
      ...ideaData,
      order: nextOrder,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('ideas').add(newIdea);
    res.json({ id: docRef.id, ...newIdea });
  } catch (error) {
    console.error('Error creating idea:', error);
    res.status(500).json({ error: 'Failed to create idea' });
  }
}));

// PUT /ideas/:id - Update idea
export const updateIdea = onRequest(withCors(async (req, res) => {
  try {
    if (req.method !== 'PUT') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const ideaId = req.query.id as string;
    if (!ideaId) {
      res.status(400).json({ error: 'Idea ID required' });
      return;
    }

    const updateData = req.body;
    
    // Check if title changed and if new title already exists
    if (updateData.title) {
      const existingIdeas = await db.collection('ideas')
        .where('title', '==', updateData.title)
        .get();
      
      if (!existingIdeas.empty && existingIdeas.docs[0].id !== ideaId) {
        res.status(400).json({ error: 'Title already exists' });
        return;
      }
    }

    // Update with timestamp
    const updatedIdea = {
      ...updateData,
      updatedAt: FieldValue.serverTimestamp()
    };

    await db.collection('ideas').doc(ideaId).update(updatedIdea);
    res.json({ id: ideaId, ...updatedIdea });
  } catch (error) {
    console.error('Error updating idea:', error);
    res.status(500).json({ error: 'Failed to update idea' });
  }
}));

// DELETE /ideas/:id - Delete idea
export const deleteIdea = onRequest(withCors(async (req, res) => {
  try {
    if (req.method !== 'DELETE') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const ideaId = req.query.id as string;
    if (!ideaId) {
      res.status(400).json({ error: 'Idea ID required' });
      return;
    }

    await db.collection('ideas').doc(ideaId).delete();
    res.json({ message: 'Idea deleted successfully' });
  } catch (error) {
    console.error('Error deleting idea:', error);
    res.status(500).json({ error: 'Failed to delete idea' });
  }
}));

// PUT /ideas/reorder - Reorder ideas
export const reorderIdeas = onRequest(withCors(async (req, res) => {
  try {
    if (req.method !== 'PUT') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { reorderedIds } = req.body;
    if (!Array.isArray(reorderedIds)) {
      res.status(400).json({ error: 'reorderedIds must be an array' });
      return;
    }

    // Update orders in batch
    const batch = db.batch();
    reorderedIds.forEach((id: string, index: number) => {
      const ideaRef = db.collection('ideas').doc(id);
      batch.update(ideaRef, { 
        order: index + 1,
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    res.json({ message: 'Ideas reordered successfully' });
  } catch (error) {
    console.error('Error reordering ideas:', error);
    res.status(500).json({ error: 'Failed to reorder ideas' });
  }
}));

// GET /validate-title - Validate title uniqueness
export const validateTitle = onRequest(withCors(async (req, res) => {
  try {
    const title = req.query.title as string;
    const excludeId = req.query.excludeId as string;

    if (!title) {
      res.status(400).json({ error: 'Title parameter required' });
      return;
    }

    let query = db.collection('ideas').where('title', '==', title);
    const snapshot = await query.get();
    
    // If excludeId is provided, check if the found idea is the same one being edited
    const isValid = snapshot.empty || 
      (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId);

    res.json({ isValid });
  } catch (error) {
    console.error('Error validating title:', error);
    res.status(500).json({ error: 'Failed to validate title' });
  }
}));

// Health check endpoint
export const health = onRequest({ cors: true }, async (req, res) => {
  try {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'Firebase Functions'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 