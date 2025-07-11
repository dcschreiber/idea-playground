import admin from 'firebase-admin';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'idea-playground-1f730'
});

const db = admin.firestore();

async function backupFirestoreData() {
  console.log('🔄 Starting Firestore data backup...');

  try {
    // Create backup directory if it doesn't exist
    const backupDir = join(__dirname, '..', 'data', 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // Get current timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `backup-${timestamp}.json`);

    console.log('📖 Fetching ideas from Firestore...');
    const ideasSnapshot = await db.collection('ideas').orderBy('order').get();
    
    const ideas = {};
    ideasSnapshot.forEach((doc) => {
      ideas[doc.id] = {
        ...doc.data(),
        // Convert Firestore timestamps to ISO strings for JSON
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
      };
    });

    console.log('📖 Fetching dimensions from Firestore...');
    const dimensionsSnapshot = await db.collection('config').doc('dimensions').get();
    const dimensions = dimensionsSnapshot.exists ? dimensionsSnapshot.data() : null;

    // Create backup data structure
    const backupData = {
      timestamp: new Date().toISOString(),
      ideas: { ideas },
      dimensions: dimensions || {}
    };

    // Write backup to file
    console.log(`💾 Writing backup to ${backupPath}...`);
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    // Also create a latest backup for convenience
    const latestBackupPath = join(backupDir, 'latest-backup.json');
    writeFileSync(latestBackupPath, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backup completed successfully!`);
    console.log(`📁 Backup saved to: ${backupPath}`);
    console.log(`📁 Latest backup: ${latestBackupPath}`);
    console.log(`📊 Backed up ${Object.keys(ideas).length} ideas`);
    
    return backupData;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

// Run the backup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backupFirestoreData()
    .then(() => {
      console.log('🏁 Backup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('🚨 Backup script failed:', error);
      process.exit(1);
    });
}

export { backupFirestoreData }; 