const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const packageJson = require('../package.json');
const { execSync } = require('child_process');

class CRXGenerator {
  constructor() {
    this.version = packageJson.version;
    this.extensionName = 'blog-link-analyzer';
    this.privateKeyPath = path.join(__dirname, '..', `${this.extensionName}.pem`);
    this.distPath = path.join(__dirname, '..', 'dist');
  }

  // Generate RSA private key for CRX signing
  generatePrivateKey() {
    if (fs.existsSync(this.privateKeyPath)) {
      console.log('Private key already exists, reusing...');
      return fs.readFileSync(this.privateKeyPath);
    }

    console.log('Generating new private key for CRX signing...');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    fs.writeFileSync(this.privateKeyPath, privateKey);
    console.log(`Private key saved to: ${this.extensionName}.pem`);
    return privateKey;
  }

  // Create ZIP archive of the extension
  async createZipArchive() {
    return new Promise((resolve, reject) => {
      const zipPath = path.join(__dirname, '..', 'temp-extension.zip');
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`ZIP archive created: ${archive.pointer()} bytes`);
        resolve(zipPath);
      });

      archive.on('error', reject);
      archive.pipe(output);

      // Add all files from dist directory
      archive.directory(this.distPath, false);
      archive.finalize();
    });
  }

  // Generate CRX v3 file format
  async generateCRX() {
    console.log('Starting CRX generation...');
    
    // Build Chrome version first
    console.log('Building Chrome version...');
    execSync('npm run build', { stdio: 'inherit' });

    // Generate or load private key
    const privateKey = this.generatePrivateKey();
    const keyObject = crypto.createPrivateKey(privateKey);

    // Create ZIP archive
    const zipPath = await this.createZipArchive();
    const zipData = fs.readFileSync(zipPath);

    // CRX v3 format structure:
    // 4 bytes: magic number "Cr24"
    // 4 bytes: version (3)
    // 4 bytes: header size
    // 4 bytes: public key length
    // 4 bytes: signature length
    // Variable: public key
    // Variable: signature
    // Variable: ZIP data

    const publicKey = crypto.createPublicKey(keyObject).export({ type: 'spki', format: 'der' });
    const signature = crypto.sign('sha256', zipData, keyObject);

    const headerSize = 12 + publicKey.length + signature.length;
    const header = Buffer.alloc(headerSize);

    let offset = 0;
    // Magic number
    header.write('Cr24', offset);
    offset += 4;
    // Version
    header.writeUInt32LE(3, offset);
    offset += 4;
    // Header size
    header.writeUInt32LE(headerSize, offset);
    offset += 4;
    // Public key length
    header.writeUInt32LE(publicKey.length, offset);
    offset += 4;
    // Signature length
    header.writeUInt32LE(signature.length, offset);
    offset += 4;
    // Public key
    publicKey.copy(header, offset);
    offset += publicKey.length;
    // Signature
    signature.copy(header, offset);

    // Combine header and ZIP data
    const crxData = Buffer.concat([header, zipData]);

    // Write CRX file
    const outputFileName = `${this.extensionName}-chrome-v${this.version}.crx`;
    const outputPath = path.join(__dirname, '..', outputFileName);
    fs.writeFileSync(outputPath, crxData);

    // Clean up temporary ZIP
    fs.unlinkSync(zipPath);

    console.log(`✅ CRX package created: ${outputFileName} (${crxData.length} bytes)`);
    console.log(`🔑 Private key: ${this.extensionName}.pem (keep this safe for updates!)`);
    
    return {
      crxPath: outputPath,
      keyPath: this.privateKeyPath,
      size: crxData.length
    };
  }
}

async function createChromeCRX() {
  try {
    const generator = new CRXGenerator();
    await generator.generateCRX();
  } catch (error) {
    console.error('❌ Failed to create CRX:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createChromeCRX();
}

module.exports = { CRXGenerator, createChromeCRX };