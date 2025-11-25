import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

async function createChromeZip() {
  console.log('📦 Creating Chrome ZIP file...');
  
  const output = fs.createWriteStream('blog-link-analyzer.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  archive.pipe(output);
  
  // Add required files for Chrome
  archive.directory('dist/', false);
  archive.directory('icons/', 'icons/');
  archive.file('manifest.json', fs.readFileSync('manifest.json'));
  
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log('✅ Chrome ZIP created successfully');
      resolve();
    });
    output.on('error', reject);
  });
}

createChromeZip().catch(console.error);