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
  const dockerfileContent = `# Use Node.js 18 Alpine
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY backend/dist ./dist

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
  
  content = content.replace(
    'https://your-cloud-run-url.run.app',
    cloudRunUrl
  );
  
  writeFileSync(dataServicePath, content);
  console.log(`✅ Frontend API URL updated to ${cloudRunUrl}`);
}

async function deploy() {
  console.log('🚀 Starting deployment to Google Cloud...');
  console.log('');

  try {
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