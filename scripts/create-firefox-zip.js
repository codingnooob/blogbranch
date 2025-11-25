import fs from 'fs';
import path from 'path';
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
      resolve();
    });
    output.on('error', reject);
  });
}

createFirefoxZip().catch(console.error);