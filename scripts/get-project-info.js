#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('🔍 Google Cloud Project Information Tool');
console.log('==========================================');

try {
  // Try to get project info using gcloud if available
  console.log('📋 Attempting to get Google Cloud project information...');
  
  // Get project number
  try {
    const projectNumber = execSync('gcloud projects describe blogbranch --format="value(projectNumber)"', { encoding: 'utf8' }).trim();
    console.log(`✅ Project Number: ${projectNumber}`);
    console.log(`   This should be used as CHROME_PUBLISHER_ID`);
  } catch (error) {
    console.log('❌ Could not get project number with gcloud');
    console.log('   Make sure gcloud is installed and authenticated');
  }
  
  // Get project ID (for confirmation)
  try {
    const projectId = execSync('gcloud projects describe blogbranch --format="value(projectId)"', { encoding: 'utf8' }).trim();
    console.log(`✅ Project ID: ${projectId}`);
  } catch (error) {
    console.log('❌ Could not get project ID with gcloud');
  }
  
  console.log('\n🎯 Manual Instructions:');
  console.log('1. Go to Google Cloud Console: https://console.cloud.google.com');
  console.log('2. Select the "blogbranch" project');
  console.log('3. Go to Project Settings (or Project Info)');
  console.log('4. Look for "Project Number" (should be numeric like 123456789012)');
  console.log('5. Update CHROME_PUBLISHER_ID secret with this numeric project number');
  
  console.log('\n📝 Alternative: Use Google Cloud Console URL:');
  console.log('https://console.cloud.google.com/iam-admin/settings?project=blogbranch');
  
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('\n📝 Manual Steps:');
  console.log('1. Visit https://console.cloud.google.com');
  console.log('2. Select "blogbranch" project');
  console.log('3. Go to Project Settings');
  console.log('4. Find the numeric "Project Number"');
  console.log('5. Update CHROME_PUBLISHER_ID secret with this number');
}