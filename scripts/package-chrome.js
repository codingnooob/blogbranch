#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createChromePackage() {
  const output = fs.createWriteStream('blog-link-analyzer-v1.1.0.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log('✅ Chrome extension package created: blog-link-analyzer-v1.1.0.zip');
    console.log(`📦 Package size: ${archive.pointer()} bytes`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  // Create corrected popup.html for Chrome (root-level files)
  let popupHtml = fs.readFileSync('popup.html', 'utf8');
  popupHtml = popupHtml.replace(
    /<script src="\.\.\/utils\/([^"]+)"><\/script>/g,
    '<script src="$1"></script>'
  );
  fs.writeFileSync('popup-chrome.html', popupHtml);

  // Add files to archive
  const filesToInclude = [
    'manifest.json',
    'popup-chrome.html',
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
        // Rename popup-chrome.html back to popup.html in archive
        const archiveName = file === 'popup-chrome.html' ? 'popup.html' : file;
        archive.file(file, { name: archiveName });
      }
    }
  }

  await archive.finalize();
}

createChromePackage().catch(console.error);