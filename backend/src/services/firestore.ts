import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from '../config';

let db: FirebaseFirestore.Firestore | null = null;

export async function initializeFirestore(): Promise<void> {
  try {
    // Configure emulator env BEFORE creating Firestore instance
    if (config.firestore.emulator) {
      const emulatorAddress = `${config.firestore.emulatorHost}:${config.firestore.emulatorPort}`;
      process.env.FIRESTORE_EMULATOR_HOST = emulatorAddress;
      console.log(`🔧 Using Firestore emulator at ${emulatorAddress}`);
    }

    // Initialize Firebase Admin
    const app = initializeApp({ projectId: config.firestore.projectId });

    // Get Firestore instance (now points to emulator in dev)
    db = getFirestore(app);

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