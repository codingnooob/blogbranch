import fs from 'fs';
import archiver from 'archiver';

async function createFirefoxZip() {
  console.log('🦊 Creating Firefox XPI file...');
  
  const output = fs.createWriteStream('blog-link-analyzer-firefox.xpi');
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  archive.pipe(output);
  
  // Add required files for Firefox
  archive.directory('build-firefox/', false);
  archive.directory('icons/', 'icons/');
  archive.file('manifest-firefox.json', fs.readFileSync('manifest-firefox.json'));
  
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log('✅ Firefox XPI created successfully');
      console.log(`📦 XPI size: ${archive.pointer()} bytes`);
      resolve();
    });
    archive.on('error', reject);
    output.on('error', reject);
    
    archive.finalize();
  });
}

createFirefoxZip().catch(console.error);