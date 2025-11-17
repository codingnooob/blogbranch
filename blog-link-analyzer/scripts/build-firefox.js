#!/usr/bin/env node

/**
 * Firefox Extension Build Script
 * 
 * This script creates a Firefox-ready extension package that meets all
 * Firefox Developer Hub submission requirements.
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configuration
const BUILD_DIR = 'build-firefox';
const PACKAGE_NAME = 'blog-link-analyzer-firefox-v1.0.0.zip';

// Required files and directories for Firefox submission
const REQUIRED_FILES = [
  'manifest.json',
  'LICENSE',
  'PRIVACY.md',
  'FIREFOX_BUILD_README.md'
];

const REQUIRED_DIRS = [
  'background',
  'content', 
  'popup',
  'utils',
  'icons'
];

console.log('🔥 Building Firefox Extension for Submission...');

// Clean previous build
if (fs.existsSync(BUILD_DIR)) {
  console.log('🧹 Cleaning previous build...');
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}

// Create build directory
fs.mkdirSync(BUILD_DIR, { recursive: true });
console.log('📁 Created build directory:', BUILD_DIR);

// Copy required files
console.log('📋 Copying required files...');
REQUIRED_FILES.forEach(file => {
  if (fs.existsSync(file)) {
    const dest = path.join(BUILD_DIR, file);
    fs.copyFileSync(file, dest);
    console.log('  ✓', file);
  } else {
    console.error('  ✗ Missing:', file);
    process.exit(1);
  }
});

// Copy required directories
console.log('📂 Copying required directories...');
REQUIRED_DIRS.forEach(dir => {
  if (fs.existsSync(dir)) {
    const dest = path.join(BUILD_DIR, dir);
    fs.cpSync(dir, dest, { recursive: true });
    console.log('  ✓', dir + '/');
  } else {
    console.error('  ✗ Missing directory:', dir);
    process.exit(1);
  }
});

// Verify all source files are unminified
console.log('🔍 Verifying source code quality...');
const JS_FILES = [
  'background/service-worker.js',
  'content/blog-detector.js', 
  'content/link-extractor.js',
  'popup/popup.js',
  'utils/ai-service.js',
  'utils/error-handling.js',
  'utils/storage-manager.js'
];

let minifiedFound = false;
JS_FILES.forEach(file => {
  const filePath = path.join(BUILD_DIR, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for minification patterns
    const isMinified = (
      content.includes('(()=>{') ||  // Common minified pattern
      content.length > 0 && content.split('\n').length < 10 ||  // Very few lines
      (content.match(/;/g) || []).length / content.length > 0.02  // High semicolon density
    );
    
    if (isMinified) {
      console.error('  ⚠️  WARNING: File appears minified:', file);
      minifiedFound = true;
    } else {
      console.log('  ✓ Source code verified:', file);
    }
  }
});

if (minifiedFound) {
  console.error('❌ Build failed: Minified source files detected');
  process.exit(1);
}

// Create zip package
console.log('📦 Creating Firefox extension package...');
const output = fs.createWriteStream(PACKAGE_NAME);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log('✅ Firefox extension package created successfully!');
  console.log('📁 Package:', PACKAGE_NAME);
  console.log('📊 Size:', (fs.statSync(PACKAGE_NAME).size / 1024 / 1024).toFixed(2), 'MB');
  
  // Cleanup build directory
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  console.log('🧹 Cleaned up build directory');
  
  console.log('\n🎉 Ready for Firefox Developer Hub submission!');
  console.log('📖 Build instructions: See FIREFOX_BUILD_README.md');
});

archive.on('error', (err) => {
  console.error('❌ Archive creation failed:', err);
  process.exit(1);
});

archive.pipe(output);

// Add all files to archive
REQUIRED_FILES.forEach(file => {
  const filePath = path.join(BUILD_DIR, file);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: file });
  }
});

REQUIRED_DIRS.forEach(dir => {
  const dirPath = path.join(BUILD_DIR, dir);
  if (fs.existsSync(dirPath)) {
    archive.directory(dirPath, dir);
  }
});

archive.finalize();