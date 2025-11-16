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

    return {
      isBlog: confidence >= 0.5,
      confidence: confidence,
      platform: platform,
      url: url,
      hostname: hostname
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

    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
      if (patterns.url && patterns.url.test(url)) return platform;
      if (patterns.class && patterns.class.test(html)) return platform;
      if (patterns.meta) {
        const generator = document.querySelector('meta[name="generator"]');
        if (generator && patterns.meta.test(generator.content)) return platform;
      }
    }

    return null;
  }

  // Get the main content area
  function getMainContent() {
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '[class*="content"]',
      '[class*="post-content"]',
      '[class*="entry-content"]',
      '.post-body',
      '.entry-body'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.length > 500) {
        return element;
      }
    }

    // Fallback to body
    return document.body;
  }

  // Initialize blog detection
  function initializeBlogDetection() {
    const blogInfo = isBlogPost();
    
    if (blogInfo.isBlog) {
      console.log('Blog Link Analyzer: Blog post detected', blogInfo);
      
      // Store blog info for other scripts
      window.blogLinkAnalyzerData = {
        isBlog: true,
        blogInfo: blogInfo,
        mainContent: getMainContent()
      };

      // Send message to background script
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'BLOG_DETECTED',
          payload: blogInfo
        });
      }
    } else {
      console.log('Blog Link Analyzer: Not a blog post', blogInfo);
      window.blogLinkAnalyzerData = {
        isBlog: false,
        blogInfo: blogInfo
      };
    }
  }

  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBlogDetection);
  } else {
    initializeBlogDetection();
  }

})();