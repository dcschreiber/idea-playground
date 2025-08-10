import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const PROJECT_ID = 'idea-playground-1f730';
const SERVICE_NAME = 'idea-playground-backend';
const REGION = 'us-central1';

function runCommand(command, description, options = {}) {
  console.log(`🔄 ${description}...`);
  try {
    const result = execSync(command, { 
      stdio: options.quiet ? 'pipe' : 'inherit', 
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    console.log(`✅ ${description} completed`);
    return result;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

function createDockerfile() {
  const dockerfileContent = `# Use Node.js 20 Alpine
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy backend source code
COPY dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "dist/server.js"]
`;

  writeFileSync(join(PROJECT_ROOT, 'backend', 'Dockerfile'), dockerfileContent);
  console.log('✅ Dockerfile created');
}

function createCloudRunYaml() {
  const cloudRunConfig = `apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ${SERVICE_NAME}
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/execution-environment: gen2
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/execution-environment: gen2
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      containers:
      - image: gcr.io/${PROJECT_ID}/${SERVICE_NAME}
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "8080"
        - name: FIREBASE_PROJECT_ID
          value: ${PROJECT_ID}
        resources:
          limits:
            cpu: "1"
            memory: "512Mi"
          requests:
            cpu: "0.5"
            memory: "256Mi"
        startupProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          periodSeconds: 30
`;

  writeFileSync(join(PROJECT_ROOT, 'backend', 'service.yaml'), cloudRunConfig);
  console.log('✅ Cloud Run service configuration created');
}

function updateFrontendApiUrl(cloudRunUrl) {
  const dataServicePath = join(PROJECT_ROOT, 'src', 'services', 'dataService.ts');
  let content = readFileSync(dataServicePath, 'utf8');
  // Replace any existing production Cloud Run URL in the ternary with the new one
  // Matches: ? 'https://<anything>.run.app'
  content = content.replace(/\?\s*'https:\/\/[^']*\.run\.app'/, `? '${cloudRunUrl}'`);
  
  writeFileSync(dataServicePath, content);
  console.log(`✅ Frontend API URL updated to ${cloudRunUrl}`);
}

function checkDeploymentPrerequisites() {
  console.log('🔍 Checking deployment prerequisites...');
  
  const checks = [
    {
      command: 'docker --version',
      name: 'Docker',
      requirement: 'Any version',
      validator: (output) => output.includes('Docker version')
    },
    {
      command: 'gcloud --version',
      name: 'Google Cloud CLI',
      requirement: 'Any version',
      validator: (output) => output.includes('Google Cloud SDK')
    },
    {
      command: 'firebase --version',
      name: 'Firebase CLI',
      requirement: '13+',
      validator: (output) => {
        const version = output.match(/(\d+)/);
        return version && parseInt(version[1]) >= 13;
      }
    }
  ];

  let allGood = true;

  for (const check of checks) {
    try {
      const output = execSync(check.command, { encoding: 'utf8', stdio: 'pipe' });
      if (check.validator(output)) {
        console.log(`✅ ${check.name}: Available`);
      } else {
        console.log(`❌ ${check.name}: ${output.trim()} (requires ${check.requirement})`);
        allGood = false;
      }
    } catch (error) {
      console.log(`❌ ${check.name}: Not installed (requires ${check.requirement})`);
      allGood = false;
    }
  }

  // Check Docker daemon
  try {
    execSync('docker info', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ Docker daemon: Running');
  } catch (error) {
    console.log('❌ Docker daemon: Not running');
    allGood = false;
  }

  // Check authentication
  try {
    const gcloudAuth = execSync('gcloud auth list --format="value(account)" --filter="status:ACTIVE"', { 
      encoding: 'utf8', stdio: 'pipe' 
    }).trim();
    if (gcloudAuth) {
      console.log(`✅ Google Cloud: Authenticated as ${gcloudAuth}`);
    } else {
      console.log('❌ Google Cloud: Not authenticated');
      allGood = false;
    }
  } catch (error) {
    console.log('❌ Google Cloud: Authentication check failed');
    allGood = false;
  }

  try {
    const firebaseAuth = execSync('firebase projects:list', { encoding: 'utf8', stdio: 'pipe' });
    if (firebaseAuth.includes('Project Display Name') && firebaseAuth.includes('Project ID')) {
      console.log('✅ Firebase: Authenticated');
    } else {
      console.log('❌ Firebase: Not authenticated or no projects');
      allGood = false;
    }
  } catch (error) {
    console.log('❌ Firebase: Authentication check failed');
    allGood = false;
  }

  if (!allGood) {
    console.log('');
    console.log('🚨 Deployment prerequisites not met! Please:');
    console.log('1. Install Docker: https://docker.com/get-started');
    console.log('2. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install');
    console.log('3. Install Firebase CLI: npm install -g firebase-tools');
    console.log('4. Start Docker daemon');
    console.log('5. Login to services:');
    console.log('   - gcloud auth login');
    console.log('   - firebase login');
    console.log('   - gcloud auth configure-docker gcr.io');
    console.log('');
    throw new Error('Deployment prerequisites not met');
  }

  console.log('✅ All deployment prerequisites met');
  console.log('');
}

async function deploy() {
  console.log('🚀 Starting deployment to Google Cloud...');
  console.log('');

  try {
    // 0. Check prerequisites
    checkDeploymentPrerequisites();
    // 1. Build everything
    runCommand('npm run build:backend', 'Building backend');
    runCommand('npm run build:frontend', 'Building frontend');

    // 2. Create deployment files
    console.log('🔧 Creating deployment configuration...');
    createDockerfile();
    createCloudRunYaml();

    // 3. Build and push Docker image
    runCommand(
      `cd backend && docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME} .`,
      'Building Docker image'
    );
    
    runCommand(
      `docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}`,
      'Pushing Docker image to Google Container Registry'
    );

    // 4. Deploy to Cloud Run
    const deployResult = runCommand(
      `gcloud run deploy ${SERVICE_NAME} ` +
      `--image gcr.io/${PROJECT_ID}/${SERVICE_NAME} ` +
      `--platform managed ` +
      `--region ${REGION} ` +
      `--allow-unauthenticated ` +
      `--project ${PROJECT_ID} ` +
      `--format="value(status.url)"`,
      'Deploying to Cloud Run',
      { quiet: true }
    );

    const cloudRunUrl = deployResult.trim();
    console.log(`🔗 Backend deployed to: ${cloudRunUrl}`);

    // 5. Update frontend with Cloud Run URL
    updateFrontendApiUrl(cloudRunUrl);

    // 6. Rebuild frontend with new API URL
    runCommand('npm run build:frontend', 'Rebuilding frontend with Cloud Run URL');

    // 7. Deploy frontend to Firebase Hosting
    runCommand('firebase deploy --only hosting', 'Deploying frontend to Firebase Hosting');

    // 8. Run smoke tests
    console.log('🧪 Running smoke tests...');
    await runSmokeTests(cloudRunUrl);

    console.log('');
    console.log('🎉 Deployment completed successfully!');
    console.log('');
    console.log('📡 Services:');
    console.log(`🔹 Backend API: ${cloudRunUrl}`);
    console.log(`🔹 Frontend: https://${PROJECT_ID}.web.app`);
    console.log(`🔹 Health Check: ${cloudRunUrl}/health`);
    console.log('');
    console.log('🔧 Management:');
    console.log(`🔹 Cloud Run Console: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}`);
    console.log(`🔹 Firebase Console: https://console.firebase.google.com/project/${PROJECT_ID}`);
    console.log('');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure you\'re logged into Google Cloud CLI');
    console.log('2. Make sure Docker is running');
    console.log('3. Make sure you have billing enabled on the project');
    console.log('4. Check Cloud Run quotas and limits');
    console.log('5. Verify Firebase CLI permissions');
    process.exit(1);
  }
}

async function runSmokeTests(baseUrl) {
  try {
    // Test health endpoint
    const healthResult = runCommand(
      `curl -f -s ${baseUrl}/health`,
      'Testing health endpoint',
      { quiet: true }
    );
    const health = JSON.parse(healthResult);
    if (health.status !== 'healthy') {
      throw new Error('Health check failed');
    }

    // Test ideas endpoint
    runCommand(
      `curl -f -s ${baseUrl}/api/ideas | head -100`,
      'Testing ideas API endpoint',
      { quiet: true }
    );

    // Test dimensions endpoint
    runCommand(
      `curl -f -s ${baseUrl}/api/dimensions | head -100`,
      'Testing dimensions API endpoint', 
      { quiet: true }
    );

    console.log('✅ All smoke tests passed');
  } catch (error) {
    console.warn('⚠️  Some smoke tests failed, but deployment completed:', error.message);
  }
}

// Show help message
function showHelp() {
  console.log('🚀 Idea Playground Deployment Script');
  console.log('');
  console.log('Usage: node scripts/deploy.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h    Show this help message');
  console.log('');
  console.log('Prerequisites:');
  console.log('- Google Cloud CLI installed and authenticated');
  console.log('- Docker installed and running');
  console.log('- Firebase CLI installed and authenticated');
  console.log('- Billing enabled on Google Cloud project');
  console.log('');
  console.log('What this script does:');
  console.log('1. Builds backend and frontend');
  console.log('2. Creates Docker image for backend');
  console.log('3. Deploys backend to Google Cloud Run');
  console.log('4. Updates frontend API URL');
  console.log('5. Deploys frontend to Firebase Hosting');
  console.log('6. Runs smoke tests');
  console.log('');
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run deployment
deploy(); 