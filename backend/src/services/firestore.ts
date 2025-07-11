import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from '../config/index.js';

let db: FirebaseFirestore.Firestore | null = null;

export async function initializeFirestore(): Promise<void> {
  try {
    // Initialize Firebase Admin
    const app = initializeApp({
      projectId: config.firestore.projectId
    });

    // Get Firestore instance
    db = getFirestore(app);

    // Configure emulator if in development
    if (config.firestore.emulator) {
      console.log(`🔧 Using Firestore emulator at ${config.firestore.emulatorHost}:${config.firestore.emulatorPort}`);
      
      // Set emulator host for development
      process.env.FIRESTORE_EMULATOR_HOST = `${config.firestore.emulatorHost}:${config.firestore.emulatorPort}`;
    }

    console.log('🔥 Firestore initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firestore:', error);
    throw error;
  }
}

export function getFirestoreDb(): FirebaseFirestore.Firestore {
  if (!db) {
    throw new Error('Firestore not initialized. Call initializeFirestore() first.');
  }
  return db;
} 