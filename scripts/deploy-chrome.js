#!/usr/bin/env node

import chromeWebstoreUpload from 'chrome-webstore-upload';
import fs from 'fs';

// Configuration from environment variables
const config = {
  extensionId: process.env.CHROME_EXTENSION_ID,
  clientId: process.env.CHROME_CLIENT_ID,
  clientSecret: process.env.CHROME_CLIENT_SECRET,
  refreshToken: process.env.CHROME_REFRESH_TOKEN,
  zipPath: process.env.CHROME_ZIP_PATH
};

// Validate required environment variables
const requiredVars = ['extensionId', 'clientId', 'clientSecret', 'refreshToken', 'zipPath'];
const missingVars = requiredVars.filter(varName => !config[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('🚀 Starting Chrome Web Store deployment...');
console.log(`📦 Extension ID: ${config.extensionId}`);
console.log(`📁 ZIP Path: ${config.zipPath}`);

try {
  // Check if ZIP file exists
  if (!fs.existsSync(config.zipPath)) {
    throw new Error(`ZIP file not found: ${config.zipPath}`);
  }

  // Create Chrome Web Store client
  const store = chromeWebstoreUpload({
    extensionId: config.extensionId,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken: config.refreshToken
  });

  console.log('🔐 Authenticating with Chrome Web Store API...');

  // Fetch token once and reuse for both operations
  const token = await store.fetchToken();
  console.log('✅ Authentication successful');

  // Upload extension
  console.log('📤 Uploading extension...');
  const uploadResponse = await store.uploadExisting(config.zipPath, token);
  
  console.log('✅ Upload successful');
  console.log('📋 Upload response:', JSON.stringify(uploadResponse, null, 2));

  // Publish extension to trusted testers first
  console.log('🚀 Publishing to trusted testers...');
  const publishResponse = await store.publish('trustedTesters', token);
  
  console.log('✅ Published to trusted testers successfully');
  console.log('📋 Publish response:', JSON.stringify(publishResponse, null, 2));

  // If trusted testers publish succeeds, publish to default
  console.log('🚀 Publishing to all users...');
  const defaultPublishResponse = await store.publish('default', token);
  
  console.log('✅ Published to all users successfully');
  console.log('📋 Final publish response:', JSON.stringify(defaultPublishResponse, null, 2));

  console.log('🎉 Chrome Web Store deployment completed successfully!');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  
  // Provide more detailed error information
  if (error.response) {
    console.error('📋 Error response:', JSON.stringify(error.response.data, null, 2));
  }
  
  process.exit(1);
}