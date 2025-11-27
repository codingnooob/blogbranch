#!/usr/bin/env node

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';

// Configuration from environment variables
const config = {
  extensionId: process.env.CHROME_EXTENSION_ID,
  zipPath: process.env.CHROME_ZIP_PATH,
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  workloadIdentityProvider: process.env.GOOGLE_WORKLOAD_IDENTITY_PROVIDER
};

// Validate required environment variables
const requiredVars = ['extensionId', 'zipPath'];
const missingVars = requiredVars.filter(varName => !config[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('🚀 Starting Chrome Web Store deployment with Service Account...');
console.log(`📦 Extension ID: ${config.extensionId}`);
console.log(`📁 ZIP Path: ${config.zipPath}`);

try {
  // Check if ZIP file exists
  if (!fs.existsSync(config.zipPath)) {
    throw new Error(`ZIP file not found: ${config.zipPath}`);
  }

  // Use service account directly for Chrome Web Store API
  // Chrome Web Store API supports service account authentication
  console.log('🔐 Setting up service account authentication...');
  
  // Get access token using Google Auth with workload identity federation
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/chromewebstore']
  });
  
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  
  console.log('✅ Service account authentication successful');

  // Read ZIP file
  const zipData = fs.readFileSync(config.zipPath);

  // Upload extension using Chrome Web Store API
  console.log('📤 Uploading extension...');
  
  const uploadResponse = await fetch(`https://chromewebstore.googleapis.com/upload/chromewebstore/v1.1/items/${config.extensionId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/zip',
      'x-goog-upload-protocol': 'raw'
    },
    body: zipData
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
  }

  const uploadResult = await uploadResponse.json();
  console.log('✅ Upload successful');
  console.log('📋 Upload response:', JSON.stringify(uploadResult, null, 2));

  // Publish extension to trusted testers first
  console.log('🚀 Publishing to trusted testers...');
  
  const publishTestersResponse = await fetch(`https://chromewebstore.googleapis.com/chromewebstore/v1.1/items/${config.extensionId}/publish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GOOGLE_API_KEY || ''
    },
    body: JSON.stringify({
      target: 'trustedTesters'
    })
  });

  if (!publishTestersResponse.ok) {
    const errorText = await publishTestersResponse.text();
    throw new Error(`Trusted testers publish failed: ${publishTestersResponse.status} ${publishTestersResponse.statusText} - ${errorText}`);
  }

  const publishTestersResult = await publishTestersResponse.json();
  console.log('✅ Published to trusted testers successfully');
  console.log('📋 Trusted testers response:', JSON.stringify(publishTestersResult, null, 2));

  // Publish to all users
  console.log('🚀 Publishing to all users...');
  
  const publishResponse = await fetch(`https://chromewebstore.googleapis.com/chromewebstore/v1.1/items/${config.extensionId}/publish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GOOGLE_API_KEY || ''
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
  console.log('✅ Published to all users successfully');
  console.log('📋 Final publish response:', JSON.stringify(publishResult, null, 2));

  console.log('🎉 Chrome Web Store deployment completed successfully!');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  
  // Provide more detailed error information
  if (error.response) {
    console.error('📋 Error response:', JSON.stringify(error.response.data, null, 2));
  }
  
  process.exit(1);
}