// Link Extractor Utils - Wrapper for content script functionality
// This file provides the extractBlogLinks function for testing

// Import from the content script version
const contentExtractor = require('../content/link-extractor.js');

// Re-export the main function for tests
module.exports = {
  extractBlogLinks: contentExtractor.extractBlogLinks || function() {
    // Fallback implementation for testing
    if (typeof document === 'undefined') {
      // Node.js testing environment
      return [];
    }
    
    const links = document.querySelectorAll('a[href]');
    const blogLinks = [];
    
    links.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      
      if (href && text && text.length >= 3) {
        blogLinks.push({
          href: href,
          text: text,
          title: link.getAttribute('title') || text,
          isInternal: href.startsWith('/') || href.includes(window.location.hostname),
          confidence: 0.5
        });
      }
    });
    
    return blogLinks;
  }
};