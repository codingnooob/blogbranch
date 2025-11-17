// Blog detection logic
(function() {
  'use strict';

  // Import utility functions
  const BLOG_URL_PATTERNS = [
    /\/blog\/[\w-]+\/?$/i,
    /\/post\/[\w-]+\/?$/i,
    /\/article\/[\w-]+\/?$/i,
    /\/\d{4}\/\d{2}\/[\w-]+\/?$/i,
    /\/p\/[\w-]+\/?$/i,
    /\/wp\/[\w-]+\/?$/i,
    /\/news\/[\w-]+\/?$/i,
    /\/story\/[\w-]+\/?$/i,
    /\/entry\/[\w-]+\/?$/i
  ];

  const BLOG_CONTENT_SELECTORS = [
    'article',
    '[class*="post"]',
    '[class*="entry"]',
    '[class*="article"]',
    '[class*="blog"]',
    '[class*="content"]',
    'main',
    '[role="main"]'
  ];

  const PLATFORM_PATTERNS = {
    wordpress: {
      url: /wp-content|wp-json|wp-includes/i,
      class: /wp-|wordpress/i,
      meta: /generator.*wordpress/i
    },
    medium: {
      url: /medium\.com/i,
      class: /medium/i,
      meta: /medium/i
    },
    substack: {
      url: /substack\.com/i,
      class: /substack/i,
      meta: /substack/i
    },
    ghost: {
      url: /ghost\.io|ghost\.org/i,
      class: /ghost/i,
      meta: /ghost/i
    }
  };

  // Detect if current page is a blog post
  function isBlogPost() {
    const url = window.location.href;
    const hostname = window.location.hostname;

    // Check URL patterns
    const urlMatches = BLOG_URL_PATTERNS.some(pattern => pattern.test(url));
    
    // Check for blog content indicators
    const hasBlogContent = BLOG_CONTENT_SELECTORS.some(selector => {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).some(el => {
        const text = el.textContent || '';
        return text.length > 200; // Substantial content
      });
    });

    // Check meta tags
    const hasBlogMeta = checkBlogMetaTags();

    // Check platform indicators
    const platform = detectPlatform();

    // Calculate confidence score
    let confidence = 0;
    if (urlMatches) confidence += 0.4;
    if (hasBlogContent) confidence += 0.3;
    if (hasBlogMeta) confidence += 0.2;
    if (platform) confidence += 0.1;

    // Extract metadata
    let title = document.title;
    let author = document.querySelector('meta[name="author"]')?.content || 
                 document.querySelector('meta[property="article:author"]')?.content;
    
    // Check for structured data (JSON-LD)
    const structuredData = document.querySelector('script[type="application/ld+json"]');
    if (structuredData) {
      try {
        const data = JSON.parse(structuredData.textContent);
        if (data.headline) title = data.headline;
        if (data.author && data.author.name) author = data.author.name;
      } catch (error) {
        console.warn('Error parsing structured data:', error);
      }
    }

    return {
      isBlog: confidence >= 0.5,
      confidence: confidence,
      platform: platform,
      url: url,
      hostname: hostname,
      metadata: {
        title: title,
        author: author
      }
    };
  }

  // Check for blog-related meta tags
  function checkBlogMetaTags() {
    const blogMetaSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="article:published_time"]',
      'meta[property="article:author"]',
      'meta[name="article:author"]',
      'meta[property="article:tag"]',
      'meta[name="article:tag"]',
      'meta[property="og:type"][content="article"]',
      'meta[name="og:type"][content="article"]',
      'meta[name="author"]'
    ];

    return blogMetaSelectors.some(selector => {
      return document.querySelector(selector) !== null;
    });
  }

  // Detect the blog platform
  function detectPlatform() {
    const url = window.location.href;
    const html = document.documentElement.outerHTML;

    // Check hostname first for known platforms
    if (hostname.includes('medium.com')) return 'medium';
    if (hostname.includes('substack.com')) return 'substack';
    if (hostname.includes('wordpress.com')) return 'wordpress';
    
    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
      if (patterns.url && patterns.url.test(url)) return platform;
      if (patterns.class && patterns.class.test(html)) return platform;
      if (patterns.meta) {
        const generator = document.querySelector('meta[name="generator"]');
        if (generator && patterns.meta.test(generator.content)) return platform;
      }
    }
      }
    }

    return null;
  }

  // Get the main content area
  function getMainContentElement() {
    const selectors = [
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

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim().length > 100) {
        console.log(`Main content element found with selector: ${selector}`);
        return element;
      }
    }

    // Fallback: find largest text block
    const allElements = document.querySelectorAll('div, section, article, main');
    let largestElement = null;
    let maxLength = 0;
    
    for (const element of allElements) {
      const text = element.textContent || '';
      if (text.trim().length > maxLength && text.trim().length > 100) {
        maxLength = text.trim().length;
        largestElement = element;
      }
    }
    
    const finalElement = largestElement || document.body;
    console.log(`Using fallback content element, found ${maxLength} characters`);
    return finalElement;
  }

  function getMainContent() {
    const element = getMainContentElement();
    
    // Remove unwanted elements before extracting text
    const unwantedSelectors = [
      'script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside',
      '.advertisement', '.ads', '.ad', '.adsense', '.sidebar', '.menu',
      '.navigation', '.nav', '.comments', '.comment', '.related', '.share',
      '.social', '.footer', '.header', '.banner', '.cookie-banner'
    ];

    const clone = element.cloneNode(true);
    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    const text = clone.textContent || clone.innerText || '';
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    return {
      text: cleanText,
      wordCount: cleanText.split(/\s+/).filter(word => word.length > 0).length
    };
  }

  function extractAuthor() {
    const authorSelectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="article:author"]',
      '.author',
      '.byline',
      '.post-author',
      '.entry-author',
      '.writer',
      '[rel="author"]',
      '.attribution',
      '.credit'
    ];

    for (const selector of authorSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const author = element.getAttribute('content') || element.textContent;
        if (author && author.trim().length > 0) {
          return author.trim();
        }
      }
    }

    return null;
  }

  // Enhanced message sending with retry
  function sendMessageWithRetry(message, maxRetries = 3, delay = 500) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      function attemptSend() {
        attempts++;
        console.log(`Blog Link Analyzer: Sending message attempt ${attempts}/${maxRetries}:`, message.type);
        
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(message, (response) => {
              if (chrome.runtime.lastError) {
                console.error(`Blog Link Analyzer: Message attempt ${attempts} failed:`, chrome.runtime.lastError);
                
                if (attempts < maxRetries) {
                  setTimeout(attemptSend, delay * attempts);
                } else {
                  reject(new Error(`Failed after ${maxRetries} attempts: ${chrome.runtime.lastError.message}`));
                }
              } else {
                console.log(`Blog Link Analyzer: Message sent successfully on attempt ${attempts}:`, response);
                resolve(response);
              }
            });
          } else {
            reject(new Error('Chrome runtime not available'));
          }
        } catch (error) {
          console.error(`Blog Link Analyzer: Message attempt ${attempts} threw error:`, error);
          
          if (attempts < maxRetries) {
            setTimeout(attemptSend, delay * attempts);
          } else {
            reject(error);
          }
        }
      }
      
      attemptSend();
    });
  }

  // Initialize blog detection with enhanced timing and error handling
  function initializeBlogDetection() {
    try {
      console.log('Blog Link Analyzer: Starting blog detection...', {
        readyState: document.readyState,
        url: window.location.href,
        timestamp: Date.now()
      });
      
      const blogInfo = isBlogPost();
      
      if (blogInfo.isBlog) {
        console.log('Blog Link Analyzer: Blog post detected', blogInfo);
        
        // Get main content element and extracted text
        const mainContentElement = getMainContentElement();
        const extractedContent = getMainContent();
        
        // Store blog info for other scripts with initialization flag
        window.blogLinkAnalyzerData = {
          isBlog: true,
          blogInfo: blogInfo,
          mainContentElement: mainContentElement, // DOM element for link extraction
          mainContent: extractedContent, // Text data for summarization
          pageContent: extractedContent.text, // For current page summarization
          pageAuthor: extractedContent.author, // For current page summarization
          detectionComplete: true,
          detectionTimestamp: Date.now()
        };

        // Send message to background script with retry mechanism
        sendMessageWithRetry({
          type: 'BLOG_DETECTED',
          payload: blogInfo,
          timestamp: Date.now()
        }).then((response) => {
          console.log('Blog Link Analyzer: Blog detected message confirmed by background');
        }).catch((error) => {
          console.error('Blog Link Analyzer: Failed to send blog detected message after retries:', error);
        });
      } else {
        console.log('Blog Link Analyzer: Not a blog post', blogInfo);
        window.blogLinkAnalyzerData = {
          isBlog: false,
          blogInfo: blogInfo,
          detectionComplete: true,
          detectionTimestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Critical error in blog detection:', error);
      // Store minimal data to prevent complete failure
      window.blogLinkAnalyzerData = {
        isBlog: false,
        blogInfo: { isBlog: false, confidence: 0, error: error.message },
        detectionComplete: true,
        detectionTimestamp: Date.now(),
        criticalError: true
      };
    }
  }

  // Handle messages from popup for content extraction
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'EXTRACT_PAGE_CONTENT') {
        try {
          const content = getMainContent();
          const author = extractAuthor();
          
          sendResponse({
            success: true,
            data: {
              text: content.text,
              author: author,
              wordCount: content.wordCount
            }
          });
        } catch (error) {
          console.error('Content extraction failed:', error);
          sendResponse({
            success: false,
            error: error.message
          });
        }
        return true; // Keep message channel open for async response
      }
    });
  }

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      detectBlogPost: isBlogPost
    };
  }

  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBlogDetection);
  } else {
    initializeBlogDetection();
  }

})();