#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

function createFirefoxStructure() {
  console.log('🔥 Building Firefox Extension for Submission...');
  
  // Create build directory
  const buildDir = 'build-firefox';
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir);

  // Create utils directory for Firefox structure
  const utilsDir = path.join(buildDir, 'utils');
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir);
  }

  // Copy AI service files to utils directory (Firefox structure)
  const utilsFiles = [
    { src: 'ai-service.js', dest: 'utils/ai-service.js' },
    { src: 'storage-manager.js', dest: 'utils/storage-manager.js' },
    { src: 'content-fetcher.js', dest: 'utils/content-fetcher.js' }
  ];

  // Copy required files
  const filesToCopy = [
    { src: 'manifest-firefox.json', dest: 'manifest.json' },
    { src: 'popup.html', dest: 'popup.html' },
    { src: 'popup.js', dest: 'popup.js' },
    { src: 'popup.css', dest: 'popup.css' },
    { src: 'LICENSE', dest: 'LICENSE' },
    { src: 'PRIVACY.md', dest: 'PRIVACY.md' }
  ];

  const dirsToCopy = ['background', 'content', 'icons'];

  // Copy utils files
  utilsFiles.forEach(({ src, dest }) => {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(buildDir, dest));
      console.log(`  ✓ ${dest}`);
    }
  });

  // Copy other files
  filesToCopy.forEach(({ src, dest }) => {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(buildDir, dest));
      console.log(`  ✓ ${dest}`);
    }
  });

  // Copy directories
  dirsToCopy.forEach(dir => {
    if (fs.existsSync(dir)) {
      copyDir(dir, path.join(buildDir, dir));
      console.log(`  ✓ ${dir}/`);
    }
  });

  console.log('✅ Firefox extension build completed!');
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

createFirefoxStructure();