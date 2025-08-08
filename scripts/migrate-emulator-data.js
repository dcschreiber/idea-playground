import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configure for emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';

// Initialize Firebase Admin for emulator
admin.initializeApp({
  projectId: 'idea-playground-1f730'
});

const db = admin.firestore();

async function migrateToEmulator() {
  console.log('🔄 Migrating data to Firestore emulator...');

  try {
    // Read backup data
    const backupPath = join(__dirname, '..', 'data', 'backups', 'latest-backup.json');
    console.log('📖 Reading backup data...');
    const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));

    // Migrate dimensions first
    console.log('💾 Migrating dimensions registry...');
    await db.collection('config').doc('dimensions').set(backupData.dimensions);
    console.log('✅ Dimensions migrated successfully');

    // Migrate ideas
    console.log('💾 Migrating ideas...');
    let ideaCount = 0;
    
    for (const [ideaId, idea] of Object.entries(backupData.ideas.ideas)) {
      const ideaDoc = {
        ...idea,
        createdAt: idea.createdAt ? new Date(idea.createdAt) : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: idea.updatedAt ? new Date(idea.updatedAt) : admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await db.collection('ideas').doc(ideaId).set(ideaDoc);
      ideaCount++;
      
      if (ideaCount % 5 === 0) {
        console.log(`📝 Migrated ${ideaCount} ideas...`);
      }
    }

    console.log(`✅ Successfully migrated ${ideaCount} ideas to emulator`);
    console.log('🎉 Emulator data migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateToEmulator()
  .then(() => {
    console.log('🏁 Emulator migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('🚨 Emulator migration script failed:', error);
    process.exit(1);
  }); 