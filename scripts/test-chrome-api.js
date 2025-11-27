#!/usr/bin/env node

import fs from 'fs';

// Configuration from environment variables
const config = {
  extensionId: process.env.CHROME_EXTENSION_ID,
  publisherId: process.env.CHROME_PUBLISHER_ID,
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
};

console.log('🔍 Chrome Web Store API V2 Diagnostic Tool');
console.log('===========================================');

// Validate environment variables
const requiredVars = ['extensionId', 'publisherId', 'serviceAccountKey'];
const missingVars = requiredVars.filter(varName => !config[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('📋 Configuration:');
console.log(`   Extension ID: ${config.extensionId}`);
console.log(`   Publisher ID: ${config.publisherId}`);

// Parse and validate service account key
let serviceAccountData;
try {
  serviceAccountData = JSON.parse(config.serviceAccountKey);
  console.log(`   Service Account Email: ${serviceAccountData.client_email}`);
  console.log(`   Project ID: ${serviceAccountData.project_id}`);
} catch (error) {
  console.error('❌ Invalid service account key format:', error.message);
  process.exit(1);
}

// Validate publisher ID format (should be numeric project number)
if (!/^\d+$/.test(config.publisherId)) {
  console.log('⚠️  Publisher ID should be a numeric project number (Google Cloud project number)');
  console.log(`   Current publisher ID: ${config.publisherId}`);
  console.log(`   Expected format: 123456789012 (numeric)`);
  console.log(`   For project 'blogbranch', the correct number is: 413467977054`);
} else {
  console.log('✅ Publisher ID format appears correct (numeric)');
}

// Test authentication
async function testAuthentication() {
  console.log('\n🔐 Testing authentication...');
  
  try {
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
    console.log(`   Token length: ${accessToken.length} characters`);
    
    // Test API endpoint with simple GET request
    console.log('\n📡 Testing API endpoint access...');
    
    const testUrl = `https://chromewebstore.googleapis.com/v2/publishers/${config.publisherId}/items`;
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API access successful');
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ API access failed');
      console.log('   Error:', errorText);
      
      // Provide specific guidance based on error
      if (response.status === 401) {
        console.log('\n🔧 401 Unauthorized - Possible causes:');
        console.log('   1. Service account not added to Chrome Web Store Developer Dashboard');
        console.log('   2. Publisher ID is incorrect (should be Google Cloud project number)');
        console.log('   3. Service account lacks proper permissions');
        console.log('   4. API not enabled in Google Cloud Console');
      } else if (response.status === 403) {
        console.log('\n🔧 403 Forbidden - Possible causes:');
        console.log('   1. Service account not added to Chrome Web Store Developer Dashboard');
        console.log('   2. Publisher ID is incorrect');
        console.log('   3. Insufficient permissions');
      } else if (response.status === 404) {
        console.log('\n🔧 404 Not Found - Possible causes:');
        console.log('   1. Publisher ID is incorrect');
        console.log('   2. Extension ID is incorrect');
      }
    }
    
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
  }
}

// Run the test
testAuthentication().then(() => {
  console.log('\n🎯 Recommendations:');
  console.log('1. Ensure service account email is added in Chrome Web Store Developer Dashboard');
  console.log('2. Verify publisher ID matches your Google Cloud project number');
  console.log('3. Confirm Chrome Web Store API is enabled in Google Cloud Console');
  console.log('4. Check that service account has proper IAM permissions');
}).catch(console.error);