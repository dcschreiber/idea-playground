export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '8080'),
  environment: process.env.NODE_ENV || 'development',
  
  // CORS configuration
  cors: {
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? ['https://idea-playground-1f730.web.app', 'https://idea-playground-1f730.firebaseapp.com']
      : ['http://localhost:3000', 'http://localhost:5000']
  },
  
  // Firestore configuration
  firestore: {
    emulator: process.env.NODE_ENV !== 'production',
    emulatorHost: process.env.FIRESTORE_EMULATOR_HOST || 'localhost',
    emulatorPort: parseInt(process.env.FIRESTORE_EMULATOR_PORT || '8081'),
    projectId: process.env.FIREBASE_PROJECT_ID || 'idea-playground-1f730'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  }
}; 