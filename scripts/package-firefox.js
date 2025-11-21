#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Get version from package.json
const packageJson = require('../package.json');
const VERSION = packageJson.version;

async function createFirefoxPackage() {
  const output = fs.createWriteStream(`blog-link-analyzer-firefox-${VERSION}.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`✅ Firefox extension package created: blog-link-analyzer-firefox-${VERSION}.zip`);
    console.log(`📦 Package size: ${archive.pointer()} bytes`);
  });

  archive.on('error', (err) => {
    throw err;
  });

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

  await archive.finalize();
}

createFirefoxPackage().catch(console.error);