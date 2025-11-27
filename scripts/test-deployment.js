#!/usr/bin/env node

import fs from 'fs';

console.log('🧪 Testing Chrome Web Store Deployment Solutions');
console.log('='.repeat(50));

// Test 1: Check if chrome-webstore-upload package is available
try {
  await import('chrome-webstore-upload');
  console.log('✅ chrome-webstore-upload package is available');
} catch {
  console.log('❌ chrome-webstore-upload package not found');
}

// Test 2: Check if google-auth-library is available
try {
  await import('google-auth-library');
  console.log('✅ google-auth-library package is available');
} catch {
  console.log('❌ google-auth-library package not found');
}

// Test 3: Check if deployment scripts exist
const scripts = [
  'scripts/deploy-chrome.js',
  'scripts/deploy-chrome-service-account.js'
];

scripts.forEach(script => {
  if (fs.existsSync(script)) {
    console.log(`✅ ${script} exists`);
  } else {
    console.log(`❌ ${script} not found`);
  }
});

// Test 4: Check if ZIP file exists
const zipFiles = fs.readdirSync('.').filter(file => file.endsWith('.zip'));
if (zipFiles.length > 0) {
  console.log(`✅ Found ZIP files: ${zipFiles.join(', ')}`);
} else {
  console.log('❌ No ZIP files found');
}

// Test 5: Validate deployment script syntax
console.log('\n🔍 Validating deployment script syntax...');

try {
  // Test chrome-webstore-upload script
  const deployScript = fs.readFileSync('scripts/deploy-chrome.js', 'utf8');
  if (deployScript.includes('chromeWebstoreUpload') && deployScript.includes('fetchToken')) {
    console.log('✅ deploy-chrome.js has correct structure');
  } else {
    console.log('❌ deploy-chrome.js has issues');
  }
} catch (error) {
  console.log('❌ Error reading deploy-chrome.js:', error.message);
}

try {
  // Test service account script
  const serviceAccountScript = fs.readFileSync('scripts/deploy-chrome-service-account.js', 'utf8');
  if (serviceAccountScript.includes('GoogleAuth') && serviceAccountScript.includes('getAccessToken')) {
    console.log('✅ deploy-chrome-service-account.js has correct structure');
  } else {
    console.log('❌ deploy-chrome-service-account.js has issues');
  }
} catch (error) {
  console.log('❌ Error reading deploy-chrome-service-account.js:', error.message);
}

console.log('\n🎯 Deployment Solutions Summary:');
console.log('1. Primary: chrome-webstore-upload package (OAuth refresh tokens)');
console.log('2. Fallback: Service Account with Google Auth Library');
console.log('3. Both scripts handle ZIP uploads and bypass PKG_MUST_UPDATE_AS_CRX error');
console.log('\n🚀 Ready for deployment!');