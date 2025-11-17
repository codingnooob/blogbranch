// Blog Detector Utils - Wrapper for content script functionality
// This file provides the detectBlogPost function for testing

// Create detectBlogPost function for testing
function detectBlogPost() {
  if (typeof document === 'undefined') {
    // Node.js testing environment - return default values
    return {
      isBlog: false,
      confidence: 0,
      platform: null,
      url: 'https://example.com',
      hostname: 'example.com'
    };
  }
  
  // Implementation for testing
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  // Check URL patterns for blog detection
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
  
  // Check URL patterns
  const urlMatches = BLOG_URL_PATTERNS.some(pattern => pattern.test(url));
  
  // Check for platform indicators
  let platform = null;
  if (hostname.includes('wordpress.com') || document.querySelector('meta[name="generator"][content*="WordPress"]')) {
    platform = 'wordpress';
  } else if (hostname.includes('medium.com')) {
    platform = 'medium';
  } else if (hostname.includes('substack.com')) {
    platform = 'substack';
  }
  
  // Calculate confidence score
  let confidence = 0;
  if (urlMatches) confidence += 0.4;
  if (platform) confidence += 0.3;
  
  // Check meta tags
  const hasBlogMeta = document.querySelector('meta[property="article:tag"]') ||
                      document.querySelector('meta[name="keywords"]') ||
                      document.querySelector('meta[property="article:section"]');
  if (hasBlogMeta) confidence += 0.3;
  
  return {
    isBlog: confidence >= 0.5,
    confidence: confidence,
    platform: platform,
    url: url,
    hostname: hostname,
    metadata: {
      title: document.title,
      author: document.querySelector('meta[name="author"]')?.content || null
    }
  };
}

// Export for testing
module.exports = {
  detectBlogPost
};