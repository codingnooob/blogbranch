import fs from 'fs';
import archiver from 'archiver';
import path from 'path';

async function createChromeZip() {
  console.log('📦 Creating Chrome ZIP file...');
  
  const output = fs.createWriteStream('blog-link-analyzer.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  archive.pipe(output);
  
  // Add all built files from dist directory
  if (fs.existsSync('dist/')) {
    archive.directory('dist/', false);
    console.log('📁 Added dist/ directory');
  } else {
    console.error('❌ dist/ directory not found!');
  }
  
  // Add icons directory
  if (fs.existsSync('icons/')) {
    archive.directory('icons/', 'icons/');
    console.log('🎨 Added icons/ directory');
  }
  
  // Add manifest.json
  if (fs.existsSync('manifest.json')) {
    archive.file('manifest.json', fs.readFileSync('manifest.json'));
    console.log('📄 Added manifest.json');
  }
  
  // List all files being added for verification
  console.log('📋 ZIP Contents:');
  archive.on('entry', (entry) => {
    console.log(`   ${entry.name} (${entry.size} bytes)`);
  });
  
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log('✅ Chrome ZIP created successfully');
      console.log(`📦 ZIP size: ${archive.pointer()} bytes`);
      console.log(`📁 Total files: ${archive.entries} entries`);
      resolve();
    });
    archive.on('error', reject);
    output.on('error', reject);
    
    archive.finalize();
  });
}

createChromeZip().catch(console.error);