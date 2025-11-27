#!/usr/bin/env node



// Test with the CORRECT publisher ID (numeric project number)
const config = {
  extensionId: process.env.CHROME_EXTENSION_ID || 'test-extension-id',
  publisherId: '413467977054', // Correct numeric project number
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
};

console.log('🧪 Testing Chrome Web Store API with CORRECT Publisher ID');
console.log('========================================================');

if (!config.serviceAccountKey) {
  console.log('❌ GOOGLE_SERVICE_ACCOUNT_KEY not available in local environment');
  console.log('📝 This script should be run in GitHub Actions environment');
  console.log('🔧 Testing with simulated configuration...');
  
  // Simulate the test
  console.log('\n📋 Test Configuration:');
  console.log(`   Extension ID: ${config.extensionId}`);
  console.log(`   Publisher ID: ${config.publisherId} (CORRECT - numeric)`);
  console.log(`   Service Account: ${config.serviceAccountKey ? 'Available' : 'Not Available'}`);
  
  console.log('\n✅ Expected Results:');
  console.log('   - API endpoint: /v2/publishers/413467977054/items');
  console.log('   - Should return 200 OK instead of 404 Not Found');
  console.log('   - Should authenticate successfully with proper service account');
  console.log('   - Should allow extension upload and publish');
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Update CHROME_PUBLISHER_ID secret to 413467977054');
  console.log('   2. Run workflow to test the fix');
  console.log('   3. Verify Chrome Web Store deployment succeeds');
  
} else {
  // Run actual test if service account key is available
  console.log('📋 Configuration:');
  console.log(`   Extension ID: ${config.extensionId}`);
  console.log(`   Publisher ID: ${config.publisherId}`);
  
  try {
    const serviceAccountData = JSON.parse(config.serviceAccountKey);
    console.log(`   Service Account: ${serviceAccountData.client_email}`);
    
    console.log('\n🔐 Testing authentication...');
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
    
    console.log('✅ Authentication successful');
    
    console.log('\n📡 Testing API endpoint...');
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
      console.log('✅ API access successful - Publisher ID is correct!');
    } else {
      const errorText = await response.text();
      console.log('❌ API access failed');
      console.log('   Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}