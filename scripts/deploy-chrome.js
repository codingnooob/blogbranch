#!/usr/bin/env node

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

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

  console.log('🔐 Authenticating with Chrome Web Store API...');

  // Use chrome-webstore-upload-cli for V2 API compatibility
  const uploadCmd = `npx chrome-webstore-upload-cli upload ${config.zipPath} ${config.extensionId}`;
  const publishCmd = `npx chrome-webstore-upload-cli publish ${config.extensionId}`;

  // Upload extension
  console.log('📤 Uploading extension...');
  await new Promise((resolve, reject) => {
    exec(uploadCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Upload failed:', error.message);
        reject(error);
      } else {
        console.log('✅ Upload successful');
        console.log('📋 Upload output:', stdout);
        resolve();
      }
    });
  });

  // Publish extension to trusted testers first
  console.log('🚀 Publishing to trusted testers...');
  await new Promise((resolve, reject) => {
    exec(publishCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Trusted testers publish failed:', error.message);
        reject(error);
      } else {
        console.log('✅ Published to trusted testers successfully');
        console.log('📋 Publish output:', stdout);
        resolve();
      }
    });
  });

  // Publish to all users
  console.log('🚀 Publishing to all users...');
  await new Promise((resolve, reject) => {
    exec(publishCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Final publish failed:', error.message);
        reject(error);
      } else {
        console.log('✅ Published to all users successfully');
        console.log('📋 Final publish output:', stdout);
        resolve();
      }
    });
  });

  console.log('🎉 Chrome Web Store deployment completed successfully!');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}