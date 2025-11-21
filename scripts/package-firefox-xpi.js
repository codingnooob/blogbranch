#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createFirefoxXPI() {
  console.log('Starting XPI generation...');
  
  // First build Firefox structure
  const { execSync } = require('child_process');
  execSync('node scripts/build-firefox.js', { stdio: 'inherit' });
  
  // Create XPI with web-ext
  const webExt = require('web-ext');
  
  try {
    await webExt.cmd.build({
      sourceDir: 'build-firefox',
      artifactsDir: '.',
      filename: 'blog-link-analyzer-firefox-v1.1.1.xpi',
      overwriteDest: true
    });
    
    console.log('✅ XPI package created: blog-link-analyzer-firefox-v1.1.1.xpi');
    
    // Get file size
    const stats = fs.statSync('blog-link-analyzer-firefox-v1.1.0.xpi');
    console.log(`📦 Package size: ${stats.size} bytes`);
    
  } catch (error) {
    console.error('❌ XPI generation failed:', error.message);
    process.exit(1);
  }
}

createFirefoxXPI().catch(console.error);