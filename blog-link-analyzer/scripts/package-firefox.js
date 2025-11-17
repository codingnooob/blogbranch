const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');
const { execSync } = require('child_process');

async function createPackage() {
  const version = packageJson.version;
  const outputFileName = `blog-link-analyzer-firefox-v${version}.zip`;
  const outputPath = path.join(__dirname, '..', outputFileName);

  // Build Firefox version (Manifest V2)
  console.log('Building Firefox version...');
  execSync('npm run build:firefox', { stdio: 'inherit' });

  // Create Firefox manifest content directly
  const firefoxManifestContent = JSON.stringify({
    "manifest_version": 2,
    "name": "Blog Link Analyzer",
    "version": "1.0.0",
    "description": "Detects blog posts and extracts linked blog content with titles and authors",
    "permissions": [
      "activeTab",
      "storage",
      "<all_urls>"
    ],
    "background": {
      "scripts": ["background/service-worker.js"],
      "persistent": false
    },
    "content_scripts": [
      {
        "matches": ["<all_urls>"],
        "js": ["content/blog-detector.js", "content/link-extractor.js"],
        "css": ["content/content-styles.css"],
        "run_at": "document_idle"
      }
    ],
    "browser_action": {
      "default_popup": "popup/popup.html",
      "default_title": "Blog Link Analyzer",
      "default_icon": {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      }
    },
    "icons": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "web_accessible_resources": [
      "utils/*.js"
    ],
    "content_security_policy": "script-src 'self'; object-src 'self'; connect-src 'self' https://api.openai.com https://api.anthropic.com http://localhost:11434 https://*.ollama.com;",
    "homepage_url": "https://codingnooob.github.io/blogbranch/",
    "browser_specific_settings": {
      "gecko": {
        "id": "codingnooob3@gmail.com",
        "strict_min_version": "78.0",
        "data_collection_permissions": {
          "required": ["websiteContent", "websiteActivity"],
          "optional": ["technicalAndInteraction", "browsingActivity"]
        }
      }
    }
  });

  // Create temporary directory for Firefox package structure
  const tempDir = path.join(__dirname, '..', 'temp-firefox-package');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  // Copy built files to temp directory
  console.log('Preparing Firefox package structure...');
  execSync(`cp -r dist/* ${tempDir}/`, { stdio: 'inherit' });

  // Write Firefox manifest.json at root level
  fs.writeFileSync(path.join(tempDir, 'manifest.json'), firefoxManifestContent);

  // Create ZIP from temp directory
  console.log('Creating Firefox package...');
  execSync(`cd ${tempDir} && zip -r ../${outputFileName} .`, { stdio: 'inherit' });

  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  console.log(`Firefox package created: ${outputFileName}`);
}

createPackage().catch(console.error);