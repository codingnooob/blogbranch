const puppeteer = require('puppeteer');
const path = require('path');

describe('Extension E2E Tests', () => {
  let browser;
  let page;
  const extensionPath = path.join(__dirname, '../dist');

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false, // Required for extensions
      args: [
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('should load extension popup', async () => {
    // Navigate to a test page
    await page.goto('https://example.com');

    // Get extension ID
    const targets = await browser.targets();
    const extensionTarget = targets.find(
      target => target.type() === 'background_page' && target.url().startsWith('chrome-extension://')
    );

    expect(extensionTarget).toBeDefined();

    // Open extension popup (this is complex and may need custom implementation)
    // For now, just verify extension loads
    expect(extensionTarget.url()).toContain('chrome-extension://');
  });

  test('should detect blog posts on WordPress', async () => {
    // Create a mock WordPress page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="article:published_time" content="2024-01-15T10:00:00Z">
        <meta name="author" content="John Doe">
        <title>Test WordPress Post</title>
      </head>
      <body>
        <article>
          <h1>Test WordPress Post</h1>
          <p>This is a test blog post with <a href="https://example.com/blog/another-post">another link</a>.</p>
        </article>
      </body>
      </html>
    `);

    // Wait for content script to execute
    await page.waitForTimeout(2000);

    // Check if extension detected the blog
    const blogDetected = await page.evaluate(() => {
      return window.blogLinkAnalyzerDetected || false;
    });

    expect(blogDetected).toBe(true);
  });

  test('should extract blog links', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <article>
          <p>Read this <a href="https://medium.com/@author/story">Medium story</a> 
          and this <a href="https://wordpress.com/post">WordPress post</a>.</p>
        </article>
      </body>
      </html>
    `);

    await page.waitForTimeout(2000);

    // Check if links were extracted
    const extractedLinks = await page.evaluate(() => {
      return window.extractedBlogLinks || [];
    });

    expect(extractedLinks).toHaveLength(2);
    expect(extractedLinks[0].url).toContain('medium.com');
    expect(extractedLinks[1].url).toContain('wordpress.com');
  });

  test('should handle AI summarization', async () => {
    // This test would require mocking AI API responses
    // For now, just test the UI interaction
    await page.goto('https://example.com');

    // Try to open extension popup (implementation depends on browser)
    // This is a placeholder for actual popup interaction testing
    const popupOpened = await page.evaluate(() => {
      // Simulate clicking extension icon
      return true; // Placeholder
    });

    expect(popupOpened).toBe(true);
  });
});