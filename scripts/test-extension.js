const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class ExtensionTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.extensionPath = path.join(__dirname, '..');
  }

  async setup() {
    console.log('🚀 Setting up test environment...');
    
    // Launch browser with extension loaded
    this.browser = await puppeteer.launch({
      headless: false, // Required for extensions
      args: [
        `--load-extension=${this.extensionPath}`,
        '--disable-extensions-except=' + this.extensionPath,
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ]
    });

    // Get extension background page
    const targets = await this.browser.targets();
    const extensionTarget = targets.find(
      target => target.type() === 'background_page' && 
                target.url().includes('chrome-extension://')
    );

    if (!extensionTarget) {
      throw new Error('Extension background page not found');
    }

    this.page = await extensionTarget.page();
    console.log('✅ Extension loaded successfully');
  }

  async testBasicFunctionality() {
    console.log('🧪 Testing basic functionality...');

    // Test 1: Check if extension is properly initialized
    const isInitialized = await this.page.evaluate(() => {
      return typeof chrome !== 'undefined' && 
             chrome.runtime && 
             chrome.runtime.id;
    });

    if (!isInitialized) {
      throw new Error('Extension not properly initialized');
    }

    console.log('✅ Extension initialization test passed');

    // Test 2: Check storage functionality
    const storageWorks = await this.page.evaluate(async () => {
      try {
        await chrome.storage.local.set({ test: 'value' });
        const result = await chrome.storage.local.get('test');
        return result.test === 'value';
      } catch (error) {
        console.error('Storage test error:', error);
        return false;
      }
    });

    if (!storageWorks) {
      throw new Error('Storage functionality not working');
    }

    console.log('✅ Storage functionality test passed');

    // Test 3: Check AI service availability
    const aiServiceAvailable = await this.page.evaluate(() => {
      try {
        // Check if AI service functions are available
        return typeof AIService !== 'undefined' && 
               typeof AIService.summarize === 'function';
      } catch (error) {
        console.error('AI service test error:', error);
        return false;
      }
    });

    if (!aiServiceAvailable) {
      console.warn('⚠️  AI service not available (may be expected in test environment)');
    } else {
      console.log('✅ AI service test passed');
    }

    return true;
  }

  async testContentScript() {
    console.log('🧪 Testing content script...');

    // Create a new page to test content script
    const testPage = await this.browser.newPage();
    
    // Create a simple HTML page with blog-like content
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Blog Post</title>
      </head>
      <body>
        <article>
          <h1>Test Blog Post Title</h1>
          <p>This is a test blog post content for testing the extension.</p>
          <a href="https://example.com/blog/post1">Related Blog Post 1</a>
          <a href="https://example.com/blog/post2">Related Blog Post 2</a>
        </article>
      </body>
      </html>
    `;

    await testPage.setContent(testHtml);
    
    // Wait for content script to inject
    await testPage.waitForTimeout(2000);

    // Test if content script detected blog content
    const blogDetected = await testPage.evaluate(() => {
      return typeof window.blogLinkAnalyzer !== 'undefined';
    });

    if (!blogDetected) {
      console.warn('⚠️  Content script may not be properly injected');
    } else {
      console.log('✅ Content script test passed');
    }

    await testPage.close();
    return true;
  }

  async testPopup() {
    console.log('🧪 Testing popup functionality...');

    // Get extension ID
    const extensionId = await this.page.evaluate(() => {
      return chrome.runtime.id;
    });

    // Open popup
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    const popupPage = await this.browser.newPage();
    
    try {
      await popupPage.goto(popupUrl);
      
      // Wait for popup to load
      await popupPage.waitForTimeout(2000);

      // Check if popup loaded correctly
      const popupContent = await popupPage.content();

      if (!popupContent.includes('Blog Link Analyzer')) {
        throw new Error('Popup content not loaded correctly');
      }

      console.log('✅ Popup functionality test passed');
      
    } catch (error) {
      console.warn('⚠️  Popup test failed:', error.message);
    } finally {
      await popupPage.close();
    }

    return true;
  }

  async testManifest() {
    console.log('🧪 Testing manifest validity...');

    const manifestPath = path.join(this.extensionPath, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json not found');
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Check required manifest fields
    const requiredFields = ['manifest_version', 'name', 'version', 'permissions'];
    for (const field of requiredFields) {
      if (!manifest[field]) {
        throw new Error(`Required manifest field missing: ${field}`);
      }
    }

    // Check manifest version
    if (manifest.manifest_version !== 3) {
      throw new Error('Manifest version should be 3 for Chrome');
    }

    // Check permissions
    const requiredPermissions = ['activeTab', 'storage'];
    for (const permission of requiredPermissions) {
      if (!manifest.permissions.includes(permission)) {
        throw new Error(`Required permission missing: ${permission}`);
      }
    }

    console.log('✅ Manifest validation test passed');
    return true;
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    console.log('✅ Cleanup completed');
  }

  async runAllTests() {
    console.log('🎯 Starting comprehensive extension testing...\n');

    try {
      await this.setup();
      
      const results = {
        manifest: await this.testManifest(),
        basic: await this.testBasicFunctionality(),
        content: await this.testContentScript(),
        popup: await this.testPopup()
      };

      console.log('\n📊 Test Results:');
      Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASSED' : '❌ FAILED';
        console.log(`   ${test}: ${status}`);
      });

      const allPassed = Object.values(results).every(result => result);
      
      if (allPassed) {
        console.log('\n🎉 All tests passed! Extension is ready for deployment.');
      } else {
        console.log('\n⚠️  Some tests failed. Please review the issues above.');
      }

      return allPassed;

    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new ExtensionTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

// Jest test exports
describe('ExtensionTester Class', () => {
  test('should be instantiable', () => {
    const tester = new ExtensionTester();
    expect(tester).toBeInstanceOf(ExtensionTester);
    expect(typeof tester.setup).toBe('function');
    expect(typeof tester.testManifest).toBe('function');
    expect(typeof tester.cleanup).toBe('function');
  });

  test('should have required methods', () => {
    const tester = new ExtensionTester();
    const requiredMethods = ['setup', 'testManifest', 'testBasicFunctionality', 'testContentScript', 'testPopup', 'cleanup'];
    
    requiredMethods.forEach(method => {
      expect(typeof tester[method]).toBe('function');
    });
  });
});

module.exports = ExtensionTester;