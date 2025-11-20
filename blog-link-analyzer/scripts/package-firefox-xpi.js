const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');
const { execSync } = require('child_process');

class XPIGenerator {
  constructor() {
    this.version = packageJson.version;
    this.extensionName = 'blog-link-analyzer';
    this.distPath = path.join(__dirname, '..', 'dist');
    this.tempDir = path.join(__dirname, '..', 'temp-xpi');
  }

  // Create temporary directory with Firefox manifest
  prepareFirefoxPackage() {
    console.log('Preparing Firefox package structure...');
    
    // Clean up and create temp directory
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.tempDir, { recursive: true });

    // Copy built files to temp directory
    execSync(`cp -r ${this.distPath}/* ${this.tempDir}/`, { stdio: 'inherit' });

    // Create Firefox manifest content (Manifest V2)
    const firefoxManifest = {
      manifest_version: 2,
      name: "Blog Link Analyzer",
      version: "1.0.0",
      description: "Detects blog posts and extracts linked blog content with titles and authors",
      permissions: [
        "activeTab",
        "storage",
        "<all_urls>"
      ],
      background: {
        scripts: ["background/service-worker.js"],
        persistent: false
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content/blog-detector.js", "content/link-extractor.js"],
          css: ["content/content-styles.css"],
          run_at: "document_idle"
        }
      ],
      browser_action: {
        default_popup: "popup/popup.html",
        default_title: "Blog Link Analyzer",
        default_icon: {
          "16": "icons/icon16.png",
          "48": "icons/icon48.png",
          "128": "icons/icon128.png"
        }
      },
      icons: {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      },
      web_accessible_resources: [
        "utils/*.js"
      ],
      content_security_policy: "script-src 'self'; object-src 'self'; connect-src 'self' https://api.openai.com https://api.anthropic.com http://localhost:11434 https://*.ollama.com;",
      homepage_url: "https://codingnooob.github.io/blogbranch/",
      browser_specific_settings: {
        gecko: {
          id: "codingnooob3@gmail.com",
          strict_min_version: "78.0"
        }
      }
    };

    // Write Firefox manifest
    fs.writeFileSync(
      path.join(this.tempDir, 'manifest.json'),
      JSON.stringify(firefoxManifest, null, 2)
    );

    console.log('Firefox package structure prepared');
    return this.tempDir;
  }

  // Generate XPI using web-ext
  async generateXPI() {
    console.log('Starting XPI generation...');
    
    // Build Firefox version first
    console.log('Building Firefox version...');
    execSync('npm run build:firefox', { stdio: 'inherit' });

    // Prepare Firefox package
    const packageDir = this.prepareFirefoxPackage();

    // Generate XPI using web-ext
    const outputFileName = `${this.extensionName}-firefox-v${this.version}.xpi`;
    const outputPath = path.join(__dirname, '..', outputFileName);

    try {
      console.log('Creating XPI with web-ext...');
      
      // Use web-ext build command
      execSync(
        `npx web-ext build --source-dir=${packageDir} --artifacts-dir=${path.dirname(outputPath)} --filename=${outputFileName} --overwrite-dest`,
        { stdio: 'inherit' }
      );

      console.log(`✅ XPI package created: ${outputFileName}`);
      
      // Get file size
      const stats = fs.statSync(outputPath);
      console.log(`📦 Package size: ${stats.size} bytes`);

      return {
        xpiPath: outputPath,
        size: stats.size
      };

    } catch (error) {
      console.error('❌ Failed to create XPI:', error.message);
      
      // Fallback: create ZIP manually and rename to XPI
      console.log('🔄 Falling back to manual ZIP creation...');
      return this.createXPIFallback(packageDir, outputPath);
    } finally {
      // Clean up temp directory
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      }
    }
  }

  // Fallback method: create ZIP and rename to XPI
  async createXPIFallback(packageDir, outputPath) {
    const archiver = require('archiver');
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`✅ XPI package created (fallback): ${outputPath} (${archive.pointer()} bytes)`);
        resolve({
          xpiPath: outputPath,
          size: archive.pointer()
        });
      });

      archive.on('error', reject);
      archive.pipe(output);

      // Add all files from package directory
      archive.directory(packageDir, false);
      archive.finalize();
    });
  }
}

async function createFirefoxXPI() {
  try {
    const generator = new XPIGenerator();
    await generator.generateXPI();
  } catch (error) {
    console.error('❌ Failed to create XPI:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createFirefoxXPI();
}

module.exports = { XPIGenerator, createFirefoxXPI };