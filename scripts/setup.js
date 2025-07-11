import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();

function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: PROJECT_ROOT });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

function createEnvironmentFile() {
  const envContent = `# Backend Environment Variables
NODE_ENV=development
PORT=8080
FIREBASE_PROJECT_ID=idea-playground-1f730
FIRESTORE_EMULATOR_HOST=localhost:8080
LOG_LEVEL=info
LOG_FORMAT=combined
`;

  const backendEnvPath = join(PROJECT_ROOT, 'backend', '.env');
  writeFileSync(backendEnvPath, envContent);
  console.log('✅ Backend .env file created');
}

function createFrontendEnvironmentFile() {
  const envContent = `# Frontend Environment Variables
VITE_API_URL=http://localhost:8080
VITE_NODE_ENV=development
`;

  const frontendEnvPath = join(PROJECT_ROOT, '.env.local');
  writeFileSync(frontendEnvPath, envContent);
  console.log('✅ Frontend .env.local file created');
}

async function setup() {
  console.log('🚀 Starting Idea Playground setup...');
  console.log('📱 This will set up the entire development environment');
  console.log('');

  try {
    // 1. Install root dependencies
    runCommand('npm install', 'Installing root dependencies');

    // 2. Install backend dependencies
    runCommand('cd backend && npm install', 'Installing backend dependencies');

    // 3. Build backend
    runCommand('cd backend && npm run build', 'Building backend');

    // 4. Create environment files
    console.log('🔧 Creating environment files...');
    createEnvironmentFile();
    createFrontendEnvironmentFile();

    // 5. Start Firestore emulator in background
    console.log('🔥 Starting Firestore emulator...');
    console.log('⏳ This may take a moment...');
    
    // Start emulator in background
    const emulatorCommand = 'firebase emulators:start --only firestore &';
    runCommand(emulatorCommand, 'Starting Firestore emulator');
    
    // Wait for emulator to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 6. Migrate data to emulator
    runCommand('node scripts/migrate-emulator-data.js', 'Migrating data to Firestore emulator');

    // 7. Build frontend
    runCommand('npm run build', 'Building frontend');

    console.log('');
    console.log('🎉 Setup completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Run "npm run dev" to start the development server');
    console.log('2. Open http://localhost:3000 in your browser');
    console.log('3. The backend will be running on http://localhost:8080');
    console.log('4. Firestore emulator UI: http://localhost:4000');
    console.log('');
    console.log('🛠️  Development commands:');
    console.log('- npm run dev           # Start everything');
    console.log('- npm run dev:backend   # Backend only');
    console.log('- npm run dev:frontend  # Frontend only');
    console.log('- npm run backup        # Backup production data');
    console.log('- npm test              # Run tests');
    console.log('');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure you have Node.js 18+ installed');
    console.log('2. Make sure you have Firebase CLI installed');
    console.log('3. Make sure you\'re logged into Firebase CLI');
    console.log('4. Check your internet connection');
    console.log('5. Try running the setup again');
    process.exit(1);
  }
}

setup(); 