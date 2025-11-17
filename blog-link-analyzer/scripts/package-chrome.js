const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const packageJson = require('../package.json');

async function createPackage() {
  const version = packageJson.version;
  const outputFileName = `blog-link-analyzer-chrome-v${version}.zip`;
  const outputPath = path.join(__dirname, '..', outputFileName);

  // Create a file to stream archive data to
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
  });

  // Listen for all archive data to be written
  output.on('close', () => {
    console.log(`Chrome package created: ${outputFileName} (${archive.pointer()} bytes)`);
  });

  // Handle warnings and errors
  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('Warning:', err.message);
    } else {
      throw err;
    }
  });

  archive.on('error', (err) => {
    throw err;
  });

  // Pipe archive data to the file
  archive.pipe(output);

  // Append files to the archive
  const filesToInclude = [
    'dist/**/*',
    'manifest.json',
    'icons/**/*',
    'popup/**/*',
    'content/**/*',
    'utils/**/*',
    'PRIVACY.md',
    'LICENSE',
    'README.md'
  ];

  filesToInclude.forEach(pattern => {
    archive.glob(pattern, {
      cwd: path.join(__dirname, '..'),
      ignore: ['**/node_modules/**', '**/scripts/**', '**/tests/**', '**/*.backup.js']
    });
  });

  // Finalize the archive
  await archive.finalize();
}

createPackage().catch(console.error);