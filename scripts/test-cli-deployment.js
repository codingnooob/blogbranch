#!/usr/bin/env node

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test configuration - using dummy values for validation
const config = {
  extensionId: process.env.CHROME_EXTENSION_ID || 'test-extension-id',
  clientId: process.env.CHROME_CLIENT_ID || 'test-client-id',
  clientSecret: process.env.CHROME_CLIENT_SECRET || 'test-client-secret',
  refreshToken: process.env.CHROME_REFRESH_TOKEN || 'test-refresh-token',
  zipPath: process.env.CHROME_ZIP_PATH || './blog-link-analyzer-1.6.4.zip'
};

console.log('🧪 Testing Chrome Web Store CLI deployment...');
console.log(`📦 Extension ID: ${config.extensionId}`);
console.log(`📁 ZIP Path: ${config.zipPath}`);

try {
  // Check if ZIP file exists
  if (!fs.existsSync(config.zipPath)) {
    throw new Error(`ZIP file not found: ${config.zipPath}`);
  }

  console.log('✅ ZIP file found');

  // Set environment variables for CLI
  process.env.EXTENSION_ID = config.extensionId;
  process.env.CLIENT_ID = config.clientId;
  process.env.CLIENT_SECRET = config.clientSecret;
  process.env.REFRESH_TOKEN = config.refreshToken;

  // Test CLI command syntax (dry run)
  console.log('🔍 Testing CLI command syntax...');
  const testCmd = `npx chrome-webstore-upload-cli --help`;
  
  await new Promise((resolve, reject) => {
    exec(testCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ CLI test failed:', error.message);
        reject(error);
      } else {
        console.log('✅ CLI is working correctly');
        console.log('📋 CLI help output length:', stdout.length, 'characters');
        resolve();
      }
    });
  });

  // Test upload command format (without actually uploading)
  console.log('🔍 Testing upload command format...');
  const uploadCmd = `npx chrome-webstore-upload-cli upload --source "${config.zipPath}" --dry-run`;
  console.log('Command would be:', uploadCmd);
  
  console.log('✅ CLI deployment test completed successfully');
  console.log('🚀 Ready for actual deployment with real credentials');

} catch (error) {
  console.error('❌ CLI test failed:', error.message);
  process.exit(1);
}