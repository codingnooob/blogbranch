import fs from 'fs';
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
      console.log(`📦 ZIP size: ${archive.pointer()} bytes`);
      resolve();
    });
    archive.on('error', reject);
    output.on('error', reject);
    
    archive.finalize();
  });
}

createChromeZip().catch(console.error);