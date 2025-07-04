#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Starting Firebase deployment...');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, description) {
  log(`🔄 ${description}...`, 'blue');
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed`, 'green');
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    throw error;
  }
}

async function deploy() {
  try {
    // Step 1: Install dependencies
    log('📦 Installing dependencies...', 'blue');
    if (!existsSync('node_modules')) {
      exec('npm install', 'Installing root dependencies');
    }
    
    if (!existsSync('functions/node_modules')) {
      exec('cd functions && npm install', 'Installing Functions dependencies');
    }

    // Step 2: Build the frontend
    exec('npm run build', 'Building frontend application');

    // Step 3: Build Firebase Functions  
    exec('npm run build:functions', 'Building Firebase Functions');

    // Step 4: Deploy to Firebase
    log('🔥 Deploying to Firebase...', 'blue');
    exec('firebase deploy', 'Deploying to Firebase');

    // Step 5: Success message
    log('🎉 Deployment completed successfully!', 'green');
    log('✨ Your app is now live at: https://idea-playground-1f730.web.app', 'green');
    log('🔧 Functions available at: https://us-central1-idea-playground-1f730.cloudfunctions.net', 'green');

  } catch (error) {
    log('💥 Deployment failed!', 'red');
    log('Please check the error messages above and try again.', 'yellow');
    process.exit(1);
  }
}

// Run deployment
deploy(); 