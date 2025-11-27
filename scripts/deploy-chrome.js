#!/usr/bin/env node

import fs from 'fs';
import { URLSearchParams } from 'url';
import { exec } from 'child_process';

// Configuration from environment variables
const config = {
  extensionId: process.env.CHROME_EXTENSION_ID,
  publisherId: process.env.CHROME_PUBLISHER_ID,
  clientId: process.env.CHROME_CLIENT_ID,
  clientSecret: process.env.CHROME_CLIENT_SECRET,
  refreshToken: process.env.CHROME_REFRESH_TOKEN,
  zipPath: process.env.CHROME_ZIP_PATH
};

// Validate required environment variables
const requiredVars = ['extensionId', 'publisherId', 'clientId', 'clientSecret', 'refreshToken', 'zipPath'];
const missingVars = requiredVars.filter(varName => !config[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('🚀 Starting Chrome Web Store deployment using API v2 with CRX upload...');
console.log(`📦 Extension ID: ${config.extensionId}`);
console.log(`🏢 Publisher ID: ${config.publisherId}`);
console.log(`📁 ZIP Path: ${config.zipPath}`);

/**
 * Generate CRX file from ZIP if needed
 */
async function ensureCRXExists() {
  const crxPath = config.zipPath.replace('.zip', '.crx');
  
  if (fs.existsSync(crxPath)) {
    console.log(`✅ CRX file already exists: ${crxPath}`);
    return crxPath;
  }
  
  console.log('🔧 Generating CRX file from ZIP...');
  
  // Use the existing package-chrome.js script to generate CRX
  try {
    await new Promise((resolve, reject) => {
      exec('npm run package:crx', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Failed to generate CRX file:', error.message);
          if (stderr) console.error('📋 Error output:', stderr);
          reject(error);
        } else {
          console.log('✅ CRX file generated successfully');
          console.log('📋 Build output:', stdout);
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('❌ CRX generation failed:', error.message);
    throw error;
  }
  
  // Verify CRX file was created
  if (!fs.existsSync(crxPath)) {
    throw new Error(`CRX file was not created: ${crxPath}`);
  }
  
  console.log(`✅ CRX file ready: ${crxPath}`);
  return crxPath;
}

/**
 * Get OAuth2 access token using refresh token
 * Following the official Chrome Web Store API documentation
 */
async function getAccessToken() {
  console.log('🔐 Getting OAuth2 access token...');
  
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
      client_id: config.clientId
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${tokenResponse.status} ${tokenResponse.statusText} - ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('✅ Access token obtained successfully');
  return tokenData.access_token;
}

/**
 * Upload extension package using Chrome Web Store API v2 with CRX
 */
async function uploadExtension(accessToken, crxPath) {
  console.log('📤 Uploading extension CRX package...');
  
  // Read CRX file
  const crxData = fs.readFileSync(crxPath);
  
  const uploadResponse = await fetch(
    `https://chromewebstore.googleapis.com/upload/v2/publishers/${config.publisherId}/items/${config.extensionId}:upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-chrome-extension',
        'x-goog-upload-protocol': 'raw'
      },
      body: crxData
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
  }

  const uploadResult = await uploadResponse.json();
  console.log('✅ Extension CRX uploaded successfully');
  console.log('📋 Upload response:', JSON.stringify(uploadResult, null, 2));
  
  return uploadResult;
}

/**
 * Publish extension using Chrome Web Store API v2
 */
async function publishExtension(accessToken) {
  console.log('🚀 Publishing extension...');
  
  const publishResponse = await fetch(
    `https://chromewebstore.googleapis.com/v2/publishers/${config.publisherId}/items/${config.extensionId}:publish`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: 'default'
      })
    }
  );

  if (!publishResponse.ok) {
    const errorText = await publishResponse.text();
    throw new Error(`Publish failed: ${publishResponse.status} ${publishResponse.statusText} - ${errorText}`);
  }

  const publishResult = await publishResponse.json();
  console.log('✅ Extension published successfully');
  console.log('📋 Publish response:', JSON.stringify(publishResult, null, 2));
  
  return publishResult;
}

/**
 * Main deployment function
 */
async function deploy() {
  try {
    // Check if ZIP file exists
    if (!fs.existsSync(config.zipPath)) {
      throw new Error(`ZIP file not found: ${config.zipPath}`);
    }

    // Ensure CRX file exists (generate if needed)
    const crxPath = await ensureCRXExists();
    console.log(`📦 Using CRX file: ${crxPath}`);

    // Get OAuth2 access token
    const accessToken = await getAccessToken();

    // Upload extension CRX package
    await uploadExtension(accessToken, crxPath);

    // Publish extension
    await publishExtension(accessToken);

    console.log('🎉 Chrome Web Store deployment completed successfully!');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    
    // Provide more detailed error information for debugging
    if (error.message.includes('401')) {
      console.error('🔐 Authentication error - check your OAuth2 credentials');
    } else if (error.message.includes('403')) {
      console.error('🚫 Permission error - check if the service account has access to this extension');
    } else if (error.message.includes('404')) {
      console.error('🔍 Not found error - check your extension ID and publisher ID');
    } else if (error.message.includes('CRX')) {
      console.error('📦 CRX file error - check if the package was built correctly');
    }
    
    process.exit(1);
  }
}

// Run deployment
deploy();