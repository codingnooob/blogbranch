#!/usr/bin/env node

import { exec } from 'child_process';
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

  console.log('🔐 Authenticating with Chrome Web Store API...');

  // Set environment variables for CLI
  process.env.EXTENSION_ID = config.extensionId;
  process.env.CLIENT_ID = config.clientId;
  process.env.CLIENT_SECRET = config.clientSecret;
  process.env.REFRESH_TOKEN = config.refreshToken;

  // Check if we need to generate CRX from ZIP
  const crxPath = config.zipPath.replace('.zip', '.crx');
  
  // Generate CRX file if it doesn't exist
  if (!fs.existsSync(crxPath)) {
    console.log('🔧 Generating CRX file from ZIP...');
    // For now, we'll use the existing package-chrome.js script to generate CRX
    try {
      await new Promise((resolve, reject) => {
        exec('npm run package:chrome', (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Failed to generate CRX file:', error.message);
            reject(error);
          } else {
            console.log('✅ CRX file generated successfully');
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('❌ Failed to generate CRX file:', error.message);
      throw error;
    }
  }

  // Upload and publish extension using CRX file
  console.log('📤 Uploading and publishing extension...');
  const deployCmd = `npx chrome-webstore-upload-cli --source "${crxPath}"`;
  
  await new Promise((resolve, reject) => {
    exec(deployCmd, { env: { ...process.env, ...config } }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Deployment failed:', error.message);
        if (stderr) console.error('📋 Error output:', stderr);
        reject(error);
      } else {
        console.log('✅ Deployment successful');
        console.log('📋 Deployment output:', stdout);
        resolve();
      }
    });
  });

  console.log('🎉 Chrome Web Store deployment completed successfully!');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}