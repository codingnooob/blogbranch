// Common blog URL patterns for detection
const BLOG_URL_PATTERNS = [
  /\/blog\/[\w-]+\/?$/i,
  /\/post\/[\w-]+\/?$/i,
  /\/article\/[\w-]+\/?$/i,
  /\/\d{4}\/\d{2}\/[\w-]+\/?$/i,  // Date-based: /2024/01/post-title
  /\/p\/[\w-]+\/?$/i,              // Medium/Substack
  /\/wp\/[\w-]+\/?$/i,              // WordPress
  /\/news\/[\w-]+\/?$/i,
  /\/story\/[\w-]+\/?$/i,
  /\/entry\/[\w-]+\/?$/i
];

// Blog content indicators
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

// Meta tag patterns for blog detection
const BLOG_META_PATTERNS = [
  'article:published_time',
  'article:author',
  'article:tag',
  'og:type',
  'author',
  'description'
];

// Platform-specific detection patterns
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BLOG_URL_PATTERNS,
    BLOG_CONTENT_SELECTORS,
    BLOG_META_PATTERNS,
    PLATFORM_PATTERNS
  };
}