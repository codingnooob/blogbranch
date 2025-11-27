#!/usr/bin/env node

import fs from 'fs';

// Configuration from environment variables
const config = {
  extensionId: process.env.CHROME_EXTENSION_ID,
  publisherId: process.env.CHROME_PUBLISHER_ID,
  zipPath: process.env.CHROME_ZIP_PATH,
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
};

// Validate required environment variables
const requiredVars = ['extensionId', 'publisherId', 'zipPath', 'serviceAccountKey'];
const missingVars = requiredVars.filter(varName => !config[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('🚀 Starting Chrome Web Store deployment with Service Account...');
console.log(`📦 Extension ID: ${config.extensionId}`);
console.log(`🏢 Publisher ID: ${config.publisherId}`);
console.log(`📁 ZIP Path: ${config.zipPath}`);

try {
  // Check if ZIP file exists
  if (!fs.existsSync(config.zipPath)) {
    throw new Error(`ZIP file not found: ${config.zipPath}`);
  }

  // Use Google Auth Library for proper JWT handling
  console.log('🔐 Getting access token using Google Auth Library...');
  
  // Parse and validate service account key
  let serviceAccountData;
  try {
    serviceAccountData = JSON.parse(config.serviceAccountKey);
    console.log('✅ Service account key parsed successfully');
    console.log(`   Service account: ${serviceAccountData.client_email}`);
  } catch (error) {
    console.error('❌ Failed to parse service account key:', error.message);
    throw new Error('Invalid service account key format');
  }
  
  const { GoogleAuth } = await import('google-auth-library');
  
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/chromewebstore'],
    credentials: {
      client_email: serviceAccountData.client_email,
      private_key: serviceAccountData.private_key,
    }
  });
  
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  console.log('✅ Access token obtained successfully');

  // Check if we should use CRX or ZIP format
  const crxPath = config.zipPath.replace('.zip', '.crx');
  let uploadData, contentType, uploadType;

  if (fs.existsSync(crxPath)) {
    console.log('📦 Using CRX file for upload (Chrome Web Store preferred format)');
    uploadData = fs.readFileSync(crxPath);
    contentType = 'application/x-chrome-extension';
    uploadType = 'CRX';
  } else {
    console.log('📦 Using ZIP file for upload');
    uploadData = fs.readFileSync(config.zipPath);
    contentType = 'application/zip';
    uploadType = 'ZIP';
  }

  // Upload extension using Chrome Web Store API V2 (correct service account endpoints)
  console.log(`📤 Uploading extension (${uploadType} format)...`);
  
  // First, initiate upload with V2 API
  const uploadResponse = await fetch(`https://chromewebstore.googleapis.com/upload/v2/publishers/${config.publisherId}/items/${config.extensionId}:upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': contentType,
      'x-goog-upload-protocol': 'raw'
    },
    body: uploadData
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
  }

  const uploadResult = await uploadResponse.json();
  console.log('✅ Upload successful');
  console.log('📋 Upload response:', JSON.stringify(uploadResult, null, 2));

  // Publish extension using V2 API
  console.log('🚀 Publishing extension...');
  
  const publishResponse = await fetch(`https://chromewebstore.googleapis.com/v2/publishers/${config.publisherId}/items/${config.extensionId}:publish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      target: 'default'
    })
  });

  if (!publishResponse.ok) {
    const errorText = await publishResponse.text();
    throw new Error(`Publish failed: ${publishResponse.status} ${publishResponse.statusText} - ${errorText}`);
  }

  const publishResult = await publishResponse.json();
  console.log('✅ Published successfully');
  console.log('📋 Publish response:', JSON.stringify(publishResult, null, 2));

  console.log('🎉 Chrome Web Store deployment completed successfully!');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  
  // Provide more detailed error information
  if (error.response) {
    console.error('📋 Error response:', JSON.stringify(error.response.data, null, 2));
  }
  
  process.exit(1);
}