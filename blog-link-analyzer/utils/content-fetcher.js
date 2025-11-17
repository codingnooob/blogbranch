/**
 * Content Fetcher for Full Article Extraction
 * Handles fetching and extracting article content from web pages
 */

class ContentFetcher {
  constructor() {
    this.userAgent = 'Blog Link Analyzer Extension (AI Summarization)';
    this.timeout = 15000; // 15 seconds timeout
    this.maxContentLength = 50000; // Maximum characters to process
  }

  /**
   * Fetch and extract content from a URL
   * @param {string} url - The URL to fetch content from
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Extracted content with metadata
   */
  async fetchContent(url, options = {}) {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL provided');
      }

      // Check if URL is external (different origin)
      const currentOrigin = window.location.origin;
      const urlOrigin = new URL(url).origin;
      const isExternal = currentOrigin !== urlOrigin;

      if (isExternal) {
        console.log('Content Fetcher: Using background script for external URL:', url);
        return await this.fetchExternalContentViaBackground(url);
      } else {
        console.log('Content Fetcher: Using direct fetch for same-origin URL:', url);
        return await this.fetchContentDirectly(url, options);
      }

    } catch (error) {
      console.error(`Failed to fetch content from ${url}:`, error);
      
      // Enhanced error messages with troubleshooting guidance
      let enhancedError = error.message;
      const urlLower = url.toLowerCase();
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
        enhancedError = `Network error - unable to access ${url}. This could be due to:\n• The site blocking automated access\n• Network connectivity issues\n• The site requiring authentication\n\nTry opening the link directly to verify it's accessible.`;
      } else if (error.message.includes('HTTP 403')) {
        enhancedError = `Access forbidden - ${url} blocks automated access. This is common for:\n• Paywalled content\n• Sites with anti-bot protection\n• Private or restricted content\n\nConsider opening the page manually and summarizing from there.`;
      } else if (error.message.includes('HTTP 404')) {
        enhancedError = `Page not found - ${url} may be incorrect or the page has been removed.\n\nCheck if the link is correct or if the page still exists.`;
      } else if (error.message.includes('timeout')) {
        enhancedError = `Request timeout - ${url} took too long to load. This could be:\n• A slow website\n• Large page with lots of content\n• Server performance issues\n\nTry again or consider a different source.`;
      } else if (error.message.includes('CORS')) {
        enhancedError = `Access blocked by browser security policy. This is a technical limitation when accessing certain external sites.\n\nTry opening the page directly and using the current page summarization feature.`;
      } else if (error.message.includes('Invalid URL')) {
        enhancedError = `Invalid URL format - "${url}" is not a valid web address.\n\nCheck the link format and try again.`;
      } else if (urlLower.includes('pdf') || urlLower.includes('download')) {
        enhancedError = `Cannot process downloads or PDFs. The extension only works with web pages.\n\nIf this is a PDF, try converting it to a web page first.`;
      }
      
      return {
        url: url,
        error: enhancedError,
        originalError: error.message,
        success: false,
        fetchedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Fetch external content via background script (CORS-safe)
   * @param {string} url - External URL to fetch
   * @returns {Promise<Object>} Extracted content with metadata
   */
  async fetchExternalContentViaBackground(url) {
    return new Promise((resolve, reject) => {
      const chromeAPI = this.getChromeAPI();
      
      const timeout = setTimeout(() => {
        reject(new Error('Background fetch timeout - request took too long'));
      }, 20000); // 20 second timeout
      
      chromeAPI.runtime.sendMessage({
        type: 'FETCH_EXTERNAL_CONTENT',
        url: url
      }, (response) => {
        clearTimeout(timeout);
        
        if (chromeAPI.runtime.lastError) {
          reject(new Error(chromeAPI.runtime.lastError.message));
        } else if (!response || !response.success) {
          reject(new Error(response.error || 'Background fetch failed'));
        } else {
          resolve(response.data);
        }
      });
    });
  }

  /**
   * Fetch content directly for same-origin URLs
   * @param {string} url - Same-origin URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Extracted content with metadata
   */
  async fetchContentDirectly(url, options = {}) {
    // Fetch the page content
    const response = await this.fetchPage(url, options);
    const html = await response.text();

    // Extract article content
    const content = this.extractArticleContent(html, url);

    // Clean and process the content
    const cleanedContent = this.cleanContent(content.text);

    return {
      url: url,
      title: content.title,
      author: content.author,
      publishDate: content.publishDate,
      text: cleanedContent,
      excerpt: this.generateExcerpt(cleanedContent),
      wordCount: this.countWords(cleanedContent),
      fetchedAt: new Date().toISOString(),
      success: true
    };
  }

  /**
   * Fetch page with proper headers and timeout
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async fetchPage(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          ...options.headers
        },
        signal: controller.signal,
        ...options
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - page took too long to load');
      }
      
      throw error;
    }
  }

  /**
   * Extract article content from HTML
   * @param {string} html - HTML content
   * @param {string} url - Source URL
   * @returns {Object} Extracted content
   */
  extractArticleContent(html, url) {
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract title
    const title = this.extractTitle(doc);

    // Extract author
    const author = this.extractAuthor(doc);

    // Extract publish date
    const publishDate = this.extractPublishDate(doc);

    // Extract main article content
    const text = this.extractMainContent(doc);

    return {
      title,
      author,
      publishDate,
      text
    };
  }

  /**
   * Extract article title
   * @param {Document} doc - DOM document
   * @returns {string} Article title
   */
  extractTitle(doc) {
    // Try multiple selectors in order of preference
    const selectors = [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'h1',
      'title',
      '.post-title',
      '.entry-title',
      '.article-title',
      '[class*="title"]'
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const title = element.getAttribute('content') || element.textContent;
        if (title && title.trim().length > 0) {
          return title.trim();
        }
      }
    }

    return 'Untitled Article';
  }

  /**
   * Extract article author
   * @param {Document} doc - DOM document
   * @returns {string|null} Author name or null
   */
  extractAuthor(doc) {
    const selectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="twitter:creator"]',
      '.author',
      '.byline',
      '.post-author',
      '.entry-author',
      '[class*="author"]',
      '[rel="author"]'
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const author = element.getAttribute('content') || element.textContent;
        if (author && author.trim().length > 0) {
          return this.cleanAuthorName(author.trim());
        }
      }
    }

    return null;
  }

  /**
   * Extract publish date
   * @param {Document} doc - DOM document
   * @returns {Date|null} Publish date or null
   */
  extractPublishDate(doc) {
    const selectors = [
      'meta[property="article:published_time"]',
      'meta[name="publish_date"]',
      'meta[name="date"]',
      'time[datetime]',
      '.publish-date',
      '.post-date',
      '.entry-date',
      '.date',
      '[class*="date"]'
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const dateStr = element.getAttribute('content') || 
                       element.getAttribute('datetime') || 
                       element.textContent;
        
        if (dateStr) {
          const date = this.parseDate(dateStr.trim());
          if (date) {
            return date;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract main article content
   * @param {Document} doc - DOM document
   * @returns {string} Article text content
   */
  extractMainContent(doc) {
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside',
      '.advertisement', '.ads', '.sidebar', '.menu', '.navigation',
      '.comments', '.related', '.social', '.share', '.popup',
      'iframe', 'svg', 'img'
    ];

    unwantedSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // Try to find main content using various selectors
    const contentSelectors = [
      'article',
      'main',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.story-body',
      '[role="main"]',
      '#content',
      '#main'
    ];

    let contentElement = null;
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        contentElement = element;
        break;
      }
    }

    // Fallback to body if no specific content found
    if (!contentElement) {
      contentElement = doc.body;
    }

    // Extract text content
    const text = contentElement.textContent || contentElement.innerText || '';
    return text;
  }

  /**
   * Clean and process extracted content
   * @param {string} content - Raw content
   * @returns {string} Cleaned content
   */
  cleanContent(content) {
    if (!content) return '';

    return content
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove newlines and tabs
      .replace(/[\n\t]/g, ' ')
      // Remove multiple spaces
      .replace(/ {2,}/g, ' ')
      // Trim
      .trim()
      // Limit length
      .substring(0, this.maxContentLength);
  }

  /**
   * Generate excerpt from content
   * @param {string} content - Cleaned content
   * @param {number} length - Excerpt length
   * @returns {string} Content excerpt
   */
  generateExcerpt(content, length = 200) {
    if (!content) return '';
    
    const excerpt = content.substring(0, length);
    if (content.length > length) {
      return excerpt + '...';
    }
    return excerpt;
  }

  /**
   * Count words in content
   * @param {string} content - Content to analyze
   * @returns {number} Word count
   */
  countWords(content) {
    if (!content) return 0;
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Clean author name
   * @param {string} author - Raw author name
   * @returns {string} Cleaned author name
   */
  cleanAuthorName(author) {
    return author
      .replace(/^(by|author:?)\s+/i, '')
      .replace(/\s+on\s+.+$/i, '')
      .trim();
  }

  /**
   * Parse date string
   * @param {string} dateStr - Date string
   * @returns {Date|null} Parsed date or null
   */
  parseDate(dateStr) {
    try {
      // Try ISO format first
      if (dateStr.includes('T') || dateStr.includes('-')) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Try common formats
      const formats = [
        /(\d{4})-(\d{2})-(\d{2})/,
        /(\d{2})\/(\d{2})\/(\d{4})/,
        /(\d{2})-(\d{2})-(\d{4})/
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get content from the current active tab
   * @returns {Promise<Object>} Extracted content with metadata
   */
  async getCurrentTabContent() {
    try {
      // Get current active tab
      const tabs = await this.queryTabs({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        throw new Error('No active tab found');
      }

      const tab = tabs[0];
      
      // Method 1: Try message passing to content script first
      try {
        const response = await this.sendMessageToTab(tab.id, {
          type: 'EXTRACT_PAGE_CONTENT'
        });
        
        if (response && response.success) {
          console.log('Content extracted via message passing');
          return {
            url: tab.url,
            title: tab.title,
            ...response.data,
            fetchedAt: new Date().toISOString(),
            success: true
          };
        }
      } catch (messageError) {
        console.log('Message passing failed, trying script injection:', messageError.message);
      }
      
      // Method 2: Try script execution as fallback
      try {
        const results = await this.executeScript({
          target: { tabId: tab.id },
          func: this.extractPageContentFromTab
        });

        if (results && results.length > 0 && results[0].result) {
          console.log('Content extracted via script injection');
          const content = results[0].result;
          return {
            url: tab.url,
            title: tab.title,
            ...content,
            fetchedAt: new Date().toISOString(),
            success: true
          };
        }
      } catch (scriptError) {
        console.log('Script injection failed:', scriptError.message);
      }
      
      // Method 3: Try to use existing blog data from storage
      try {
        const chromeAPI = this.getChromeAPI();
        const result = await chromeAPI.storage.local.get(['blogLinkAnalyzer_data']);
        const blogData = result.blogLinkAnalyzer_data || {};
        const tabData = blogData[tab.id];
        
        if (tabData && tabData.pageContent) {
          console.log('Content extracted from storage cache');
          return {
            url: tab.url,
            title: tab.title,
            text: tabData.pageContent,
            author: tabData.pageAuthor,
            wordCount: tabData.pageContent.split(/\s+/).filter(word => word.length > 0).length,
            fetchedAt: new Date().toISOString(),
            success: true
          };
        }
      } catch (storageError) {
        console.log('Storage fallback failed:', storageError.message);
      }
      
      throw new Error('All content extraction methods failed. The page may not support content extraction or may be blocked.');

    } catch (error) {
      console.error('Failed to get current tab content:', error);
      return {
        error: error.message,
        success: false,
        fetchedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Extract content from current tab (executed in content script context)
   */
  extractPageContentFromTab() {
    try {
      // Extract title
      const title = document.title || 
                   document.querySelector('h1')?.textContent || 
                   'Untitled';

      // Extract author
      const author = document.querySelector('meta[name="author"]')?.getAttribute('content') ||
                    document.querySelector('.author')?.textContent ||
                    document.querySelector('.byline')?.textContent ||
                    null;

      // Extract main content with enhanced selectors
      const contentSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '.post-content',
        '.entry-content',
        '.post-body',
        '.article-content',
        '.story-body',
        '.post',
        '.entry',
        '.content-wrapper',
        '.post-wrapper',
        '#content',
        '#main',
        '#post-content'
      ];

      let contentElement = null;
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 100) {
          contentElement = element;
          console.log(`Content found with selector: ${selector}`);
          break;
        }
      }

      // Fallback: try to find the largest text block
      if (!contentElement) {
        const allElements = document.querySelectorAll('div, section, p');
        let largestElement = null;
        let maxLength = 0;
        
        for (const element of allElements) {
          const text = element.textContent || '';
          if (text.trim().length > maxLength && text.trim().length > 100) {
            maxLength = text.trim().length;
            largestElement = element;
          }
        }
        
        contentElement = largestElement || document.body;
        console.log(`Using fallback content extraction, found ${maxLength} characters`);
      }

      // Final fallback: use body but try to remove obvious non-content
      if (!contentElement || contentElement === document.body) {
        contentElement = document.body;
        console.log('Using document.body as content source');
      }

      // Remove unwanted elements with enhanced selectors
      const unwantedSelectors = [
        'script', 'style', 'noscript',
        'nav', 'header', 'footer', 'aside',
        '.advertisement', '.ads', '.ad', '.adsense',
        '.sidebar', '.menu', '.navigation', '.nav',
        '.comments', '.comment', '.related', '.share',
        '.social', '.footer', '.header', '.banner',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        '.cookie-banner', '.popup', '.modal', '.overlay'
      ];

      const unwantedElements = contentElement.querySelectorAll(unwantedSelectors.join(', '));
      unwantedElements.forEach(el => el.remove());

      // Try multiple text extraction methods
      let text = '';
      
      // Method 1: textContent (preserves spaces better)
      if (contentElement.textContent) {
        text = contentElement.textContent;
      }
      
      // Method 2: innerText fallback
      if ((!text || text.trim().length < 50) && contentElement.innerText) {
        text = contentElement.innerText;
      }
      
      // Method 3: Manual extraction from paragraphs
      if (!text || text.trim().length < 50) {
        const paragraphs = contentElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
        text = Array.from(paragraphs).map(p => p.textContent).join('\n');
      }
      
      // Final validation
      if (!text) {
        text = '';
        console.warn('Content extraction: All methods failed, using empty string');
      }

      return {
        title: title.trim(),
        author: author ? author.trim() : null,
        text: text.replace(/\s+/g, ' ').trim().substring(0, 50000),
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length
      };

    } catch (error) {
      return {
        error: error.message,
        title: document.title || 'Untitled',
        text: '',
        wordCount: 0
      };
    }
  }

  // Browser API abstraction methods
  async queryTabs(queryInfo) {
    if (typeof browser !== 'undefined' && browser.tabs) {
      return await browser.tabs.query(queryInfo);
    } else if (typeof chrome !== 'undefined' && chrome.tabs) {
      return await chrome.tabs.query(queryInfo);
    } else {
      throw new Error('Tab API not available');
    }
  }

  async executeScript(injection) {
    if (typeof browser !== 'undefined' && browser.scripting) {
      return await browser.scripting.executeScript(injection);
    } else if (typeof chrome !== 'undefined' && chrome.scripting) {
      return await chrome.scripting.executeScript(injection);
    } else {
      throw new Error('Scripting API not available');
    }
  }

  /**
   * Send message to content script
   * @param {number} tabId - Tab ID to send message to
   * @param {Object} message - Message to send
   * @returns {Promise<Object>} Response from content script
   */
  async sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      const chromeAPI = this.getChromeAPI();
      
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout - content script not responding'));
      }, 5000);
      
      chromeAPI.tabs.sendMessage(tabId, message, (response) => {
        clearTimeout(timeout);
        
        if (chromeAPI.runtime.lastError) {
          reject(new Error(chromeAPI.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Get Chrome API with fallback
   * @returns {Object} Chrome or browser API
   */
  getChromeAPI() {
    if (typeof browser !== 'undefined' && browser.runtime) {
      return browser; // Firefox
    } else if (typeof chrome !== 'undefined' && chrome.runtime) {
      return chrome; // Chrome
    } else {
      throw new Error('Browser APIs not available');
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentFetcher;
} else if (typeof window !== 'undefined') {
  window.ContentFetcher = ContentFetcher;
}