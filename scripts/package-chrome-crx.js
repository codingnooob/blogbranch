#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Get version from package.json
const packageJson = require('../package.json');
const VERSION = packageJson.version;

async function createChromeCRX() {
  console.log('Creating Chrome CRX package...');
  
  // First create ZIP
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream('temp-chrome.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log('✅ Chrome ZIP created for CRX generation');
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Add files to archive
    const filesToInclude = [
      'manifest.json',
      'popup.html',
      'popup.js', 
      'popup.css',
      'ai-service.js',
      'storage-manager.js',
      'content-fetcher.js',
      'background/',
      'content/',
      'icons/',
      'LICENSE',
      'PRIVACY.md'
    ];

    for (const file of filesToInclude) {
      if (fs.existsSync(file)) {
        if (fs.statSync(file).isDirectory()) {
          archive.directory(file, file);
        } else {
          archive.file(file);
        }
      }
    }

    archive.finalize();
  });

  // Convert to CRX (simplified version - in production you'd use proper signing)
  fs.copyFileSync('temp-chrome.zip', `blog-link-analyzer-${VERSION}.crx`);
  fs.unlinkSync('temp-chrome.zip');
  
  console.log(`✅ Chrome CRX package created: blog-link-analyzer-${VERSION}.crx`);
  
  const stats = fs.statSync(`blog-link-analyzer-${VERSION}.crx`);
  console.log(`📦 Package size: ${stats.size} bytes`);
}

createChromeCRX().catch(console.error);