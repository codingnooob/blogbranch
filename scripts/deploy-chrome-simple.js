#!/usr/bin/env node

import fs from 'fs';

// Configuration from environment variables
const config = {
  extensionId: process.env.CHROME_EXTENSION_ID,
  zipPath: process.env.CHROME_ZIP_PATH,
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
};

// Validate required environment variables
const requiredVars = ['extensionId', 'zipPath', 'serviceAccountKey'];
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

  // Parse service account key
  let serviceAccountKey;
  try {
    serviceAccountKey = JSON.parse(config.serviceAccountKey);
  } catch (error) {
    throw new Error('Invalid service account key format');
  }

  // Create JWT token for Chrome Web Store API
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/chromewebstore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  // Import crypto for JWT signing
  const { createSign } = await import('crypto');
  
  // Base64url encoding function
  const base64urlEncode = (str) => {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  // Create JWT
  const encodedHeader = base64urlEncode(Buffer.from(JSON.stringify(header)).toString('base64'));
  const encodedPayload = base64urlEncode(Buffer.from(JSON.stringify(payload)).toString('base64'));
  const jwtInput = `${encodedHeader}.${encodedPayload}`;
  
  // Sign JWT
  const sign = createSign(serviceAccountKey.private_key);
  const signature = sign.update(jwtInput).sign('base64');
  const encodedSignature = base64urlEncode(signature);
  
  const jwt = `${jwtInput}.${encodedSignature}`;

  // Exchange JWT for access token
  console.log('🔐 Getting access token...');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  console.log('✅ Access token obtained successfully');

  // Read ZIP file
  const zipData = fs.readFileSync(config.zipPath);

  // Upload extension using Chrome Web Store API V1 (works with service accounts)
  console.log('📤 Uploading extension...');
  
  const uploadResponse = await fetch(`https://www.googleapis.com/upload/chromewebstore/v1.1/items/${config.extensionId}`, {
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

  // Publish extension
  console.log('🚀 Publishing extension...');
  
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