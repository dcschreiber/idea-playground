import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'idea-playground-1f730'
});

const db = admin.firestore();

async function migrateData() {
  console.log('🚀 Starting data migration to Firestore...');

  try {
    // Read existing data files
    const ideasPath = join(__dirname, 'data', 'ideas.json');
    const dimensionsPath = join(__dirname, 'data', 'dimensions.json');

    console.log('📖 Reading ideas.json...');
    const ideasData = JSON.parse(readFileSync(ideasPath, 'utf8'));
    
    console.log('📖 Reading dimensions.json...');
    const dimensionsData = JSON.parse(readFileSync(dimensionsPath, 'utf8'));

    // Migrate dimensions first
    console.log('💾 Migrating dimensions registry...');
    await db.collection('config').doc('dimensions').set(dimensionsData);
    console.log('✅ Dimensions migrated successfully');

    // Migrate ideas
    console.log('💾 Migrating ideas...');
    let ideaCount = 0;
    
    for (const [ideaId, idea] of Object.entries(ideasData.ideas)) {
      const ideaDoc = {
        ...idea,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await db.collection('ideas').doc(ideaId).set(ideaDoc);
      ideaCount++;
      
      if (ideaCount % 5 === 0) {
        console.log(`📝 Migrated ${ideaCount} ideas...`);
      }
    }

    console.log(`✅ Successfully migrated ${ideaCount} ideas`);
    console.log('🎉 Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateData()
  .then(() => {
    console.log('🏁 Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('🚨 Migration script failed:', error);
    process.exit(1);
  }); 