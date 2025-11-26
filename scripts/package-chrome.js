#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const VERSION = packageJson.version;

async function createChromePackage() {
  console.log(`📦 Creating Chrome extension packages for version ${VERSION}...`);
  
  // Create ZIP package
  const zipOutput = fs.createWriteStream(`blog-link-analyzer-${VERSION}.zip`);
  const zipArchive = archiver('zip', { zlib: { level: 9 } });

  zipOutput.on('close', () => {
    console.log(`✅ Chrome ZIP package created: blog-link-analyzer-${VERSION}.zip`);
    console.log(`📦 ZIP size: ${zipArchive.pointer()} bytes`);
  });

  zipArchive.on('error', (err) => {
    throw err;
  });

  zipArchive.pipe(zipOutput);

  // Create corrected popup.html for Chrome (root-level files)
  let popupHtml = fs.readFileSync('popup.html', 'utf8');
  popupHtml = popupHtml.replace(
    /<script src="\.\.\/utils\/([^"]+)"><\/script>/g,
    '<script src="$1"></script>'
  );
  fs.writeFileSync('popup-chrome.html', popupHtml);

  // Add files to ZIP archive
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
        zipArchive.directory(file, file);
      } else {
        // Rename popup-chrome.html back to popup.html in archive
        const archiveName = file === 'popup-chrome.html' ? 'popup.html' : file;
        zipArchive.file(file, { name: archiveName });
      }
    }
  }

  await zipArchive.finalize();
}

async function createChromeCRX() {
  console.log(`🔧 Creating Chrome CRX package for version ${VERSION}...`);
  
  try {
    // Check for private key
    const privateKeyPath = 'chrome-extension.pem';
    let privateKey = null;
    
    if (fs.existsSync(privateKeyPath)) {
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      console.log('🔐 Using private key for CRX signing');
    } else {
      console.log('⚠️  No private key found, creating unsigned CRX');
    }
    
    // Create CRX using Node.js (Chrome CLI alternative)
    
    // Create temporary directory for CRX build
    const crxBuildDir = `build-crx-${VERSION}`;
    
    // Clean up any existing build directory
    if (fs.existsSync(crxBuildDir)) {
      fs.rmSync(crxBuildDir, { recursive: true, force: true });
    }
    
    // Create build directory and copy files
    fs.mkdirSync(crxBuildDir, { recursive: true });
    
    const filesToCopy = [
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

    for (const file of filesToCopy) {
      const sourcePath = file;
      const destPath = path.join(crxBuildDir, file);
      
      if (fs.existsSync(sourcePath)) {
        if (fs.statSync(sourcePath).isDirectory()) {
          // Copy directory recursively
          copyDirectory(sourcePath, destPath);
        } else {
          // Copy file
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }

    // Create CRX package manually
    console.log('📦 Creating CRX package manually...');
    
    // First create a ZIP of the extension
    const zipOutput = fs.createWriteStream(path.join(crxBuildDir, 'extension.zip'));
    const zipArchive = archiver('zip', { zlib: { level: 9 } });
    
    zipArchive.pipe(zipOutput);
    
    // Add all files to ZIP
    for (const file of filesToCopy) {
      if (fs.existsSync(file)) {
        if (fs.statSync(file).isDirectory()) {
          zipArchive.directory(file, file);
        } else {
          zipArchive.file(file, { name: file });
        }
      }
    }
    
    // Wait for ZIP to complete
    await new Promise((resolve, reject) => {
      zipOutput.on('close', resolve);
      zipArchive.on('error', reject);
      zipArchive.finalize();
    });
    
    // Convert ZIP to CRX format
    const zipData = fs.readFileSync(path.join(crxBuildDir, 'extension.zip'));
    let crxData;
    
    if (privateKey) {
      // Create signed CRX using private key
      console.log('🔐 Creating signed CRX package...');
      crxData = createSignedCRX(zipData, privateKey);
    } else {
      // Create unsigned CRX
      console.log('📦 Creating unsigned CRX package...');
      crxData = createCRX(zipData);
    }
    
    // Write CRX file
    const crxFile = `blog-link-analyzer-${VERSION}.crx`;
    fs.writeFileSync(crxFile, crxData);
    
    console.log(`✅ Chrome CRX package created: ${crxFile}`);
    const stats = fs.statSync(crxFile);
    console.log(`📦 CRX size: ${stats.size} bytes`);

    // Clean up temporary build directory
    if (fs.existsSync(crxBuildDir)) {
      fs.rmSync(crxBuildDir, { recursive: true, force: true });
    }
    
  } catch (error) {
    console.error(`❌ CRX generation failed: ${error.message}`);
    console.log('📦 Continuing with ZIP package only...');
  }
}

function createCRX(zipData) {
  // CRX magic number
  const CRX_MAGIC = 0x43723201;
  
  // Create CRX header (12 bytes for version 2)
  const header = Buffer.alloc(12);
  header.writeUInt32LE(CRX_MAGIC, 0);        // Magic number
  header.writeUInt32LE(2, 4);              // Version 2
  header.writeUInt32LE(zipData.length, 8);    // ZIP size
  
  return Buffer.concat([header, zipData]);
}

function createSignedCRX(zipData, privateKey) {
  const crypto = require('node:crypto');
  
  // CRX magic number for version 3 (signed)
  const CRX_MAGIC = 0x43723203;
  
  // Create CRX header for version 3
  const publicKey = crypto.createPublicKey('-----BEGIN PUBLIC KEY-----\n' + 
    crypto.createPublicKey(privateKey).exportKey('pem').publicKey + 
    '\n-----END PUBLIC KEY-----');
  
  // Create signature
  const signature = crypto.createSign('RSA-SHA256').update(zipData).sign(privateKey);
  
  // Calculate header sizes
  const publicKeySize = publicKey.length;
  const signatureSize = signature.length;
  const headerSize = 16 + publicKeySize + signatureSize;
  
  // Create CRX header
  const header = Buffer.alloc(16);
  header.writeUInt32LE(CRX_MAGIC, 0);        // Magic number
  header.writeUInt32LE(3, 4);              // Version 3
  header.writeUInt32LE(headerSize, 8);       // Header size
  header.writeUInt32LE(zipData.length, 12);    // ZIP size
  
  return Buffer.concat([header, publicKey, signature, zipData]);
}

function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  await createChromePackage();
  await createChromeCRX();
  
  console.log('\n🎉 Chrome packaging completed!');
  console.log('📋 Generated packages:');
  
  // List generated files
  const zipFile = `blog-link-analyzer-${VERSION}.zip`;
  const crxFile = `blog-link-analyzer-${VERSION}.crx`;
  
  if (fs.existsSync(zipFile)) {
    const stats = fs.statSync(zipFile);
    console.log(`   ✅ ${zipFile} (${stats.size} bytes)`);
  }
  
  if (fs.existsSync(crxFile)) {
    const stats = fs.statSync(crxFile);
    console.log(`   ✅ ${crxFile} (${stats.size} bytes)`);
  }
}

main().catch(console.error);