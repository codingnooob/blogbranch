// Link extraction and analysis logic
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

  // Extract metadata from a page (simplified version)
  function extractPageMetadata(document) {
    // Extract title
    let title = null;
    const titleElement = document.querySelector('title') ||
                         document.querySelector('h1') ||
                         document.querySelector('meta[property="og:title"]');
    if (titleElement) {
      title = titleElement.content || titleElement.textContent;
      title = title ? title.trim() : null;
    }

    // Extract author
    let author = null;
    const authorElement = document.querySelector('meta[name="author"]') ||
                          document.querySelector('meta[property="article:author"]') ||
                          document.querySelector('[class*="author"]');
    if (authorElement) {
      author = authorElement.content || authorElement.textContent;
      author = author ? author.trim() : null;
    }

    return {
      title: title,
      author: author,
      url: document.location.href,
      timestamp: Date.now()
    };
  }

  // Check if a URL points to a blog post
  function isBlogPostUrl(url) {
    if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
      return false;
    }

    try {
      const urlObj = new URL(url, window.location.href);
      const pathname = urlObj.pathname;
      
      return BLOG_URL_PATTERNS.some(pattern => pattern.test(pathname));
    } catch (e) {
      return false;
    }
  }

  // Check if a link is internal to the current domain
  function isInternalLink(url) {
    try {
      const urlObj = new URL(url, window.location.href);
      return urlObj.hostname === window.location.hostname;
    } catch (e) {
      return false;
    }
  }

  // Calculate confidence score for blog link classification
  function calculateBlogLinkConfidence(href, text, context) {
    let confidence = 0;

    // URL pattern matching
    if (isBlogPostUrl(href)) {
      confidence += 0.5;
    }

    // Link text analysis
    const textLower = text.toLowerCase();
    if (textLower.includes('read') || textLower.includes('continue') || 
        textLower.includes('more') || textLower.includes('article') ||
        textLower.includes('post')) {
      confidence += 0.2;
    }

    // Context analysis
    if (context) {
      const contextLower = context.toLowerCase();
      if (contextLower.includes('related') || contextLower.includes('also') ||
          contextLower.includes('next') || contextLower.includes('previous')) {
        confidence += 0.2;
      }
    }

    // Internal links are more likely to be blog posts
    if (isInternalLink(href)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  // Extract all blog post links from the current page
  function extractBlogLinks() {
    try {
      if (!window.blogLinkAnalyzerData || !window.blogLinkAnalyzerData.isBlog) {
        return [];
      }

      const mainContent = window.blogLinkAnalyzerData.mainContent || document.body;
      const links = mainContent.querySelectorAll('a[href]');
      const blogLinks = [];

      links.forEach((link, index) => {
        try {
          const href = link.getAttribute('href');
          const text = link.textContent.trim();
          
          if (!href || !text || text.length < 3) return;

          // Skip navigation, footer, and sidebar links
          const parent = link.closest('nav, footer, aside, .sidebar, .navigation, .menu');
          if (parent) return;

          // Validate URL
          if (!isBlogPostUrl(href) && !isInternalLink(href)) return;

          // Check if this looks like a blog post link
          const confidence = calculateBlogLinkConfidence(href, text, link.parentElement.textContent);
          
          if (confidence >= 0.3) {
            blogLinks.push({
              id: `link-${index}`,
              href: href,
              text: text,
              confidence: confidence,
              isInternal: isInternalLink(href),
              element: link, // Store reference for potential future use
              extracted: false // Flag to track if we've fetched metadata
            });
          }
        } catch (error) {
          console.warn('Blog Link Analyzer: Error processing link:', error);
          // Continue processing other links
        }
      });

      // Sort by confidence and limit to top results
      return blogLinks
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 50); // Limit to prevent overwhelming the user
    } catch (error) {
      console.error('Blog Link Analyzer: Error extracting blog links:', error);
      return [];
    }
  }

  // Fetch metadata for a blog post URL
  async function fetchBlogPostMetadata(url) {
    try {
      // Use a CORS proxy or fetch the page content
      // For now, we'll use a simplified approach with basic info
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors' // We'll need a different approach for cross-origin
      });

      // Since we can't directly fetch due to CORS, we'll extract basic info
      const urlObj = new URL(url, window.location.href);
      const pathSegments = urlObj.pathname.split('/').filter(segment => segment);
      const lastSegment = pathSegments[pathSegments.length - 1];
      
      // Generate a title from the URL slug
      const title = lastSegment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      return {
        title: title,
        author: null,
        url: url,
        timestamp: Date.now(),
        extracted: true
      };
    } catch (error) {
      console.error('Error fetching blog post metadata:', error);
      return {
        title: null,
        author: null,
        url: url,
        timestamp: Date.now(),
        extracted: false,
        error: error.message
      };
    }
  }

  // Extract metadata for all blog links
  async function extractAllBlogLinkMetadata() {
    const blogLinks = extractBlogLinks();
    const metadataPromises = blogLinks.map(async (link) => {
      if (link.isInternal) {
        // For internal links, we can try to extract more info
        try {
          const metadata = await fetchBlogPostMetadata(link.href);
          return {
            ...link,
            title: metadata.title || link.text,
            author: metadata.author,
            extracted: metadata.extracted
          };
        } catch (error) {
          return {
            ...link,
            title: link.text,
            author: null,
            extracted: false
          };
        }
      } else {
        // For external links, use the link text as title
        return {
          ...link,
          title: link.text,
          author: null,
          extracted: false
        };
      }
    });

    const results = await Promise.all(metadataPromises);
    return results.filter(link => link.title); // Filter out links without titles
  }

  // Initialize link extraction
  async function initializeLinkExtraction() {
    try {
      // Wait a bit for the blog detector to finish
      setTimeout(async () => {
        try {
          if (window.blogLinkAnalyzerData && window.blogLinkAnalyzerData.isBlog) {
            console.log('Blog Link Analyzer: Extracting blog links...');
            
            const blogLinks = await extractAllBlogLinkMetadata();
            
            console.log(`Blog Link Analyzer: Found ${blogLinks.length} blog links`);

            // Store results for popup
            window.blogLinkAnalyzerData.blogLinks = blogLinks;

            // Send message to background script
            if (typeof chrome !== 'undefined' && chrome.runtime) {
              chrome.runtime.sendMessage({
                type: 'BLOG_LINKS_EXTRACTED',
                payload: {
                  url: window.location.href,
                  blogLinks: blogLinks,
                  timestamp: Date.now()
                }
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('Blog Link Analyzer: Error sending message:', chrome.runtime.lastError);
                }
              });
            }
          }
        } catch (error) {
          console.error('Blog Link Analyzer: Error in link extraction initialization:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Blog Link Analyzer: Critical error in link extraction:', error);
    }
  }

  // Handle messages from background script for nested link extraction
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_BLOG_LINKS') {
        // Return current blog data for nested link extraction
        sendResponse({
          success: true,
          data: window.blogLinkAnalyzerData
        });
      }
      return true;
    });
  }

  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLinkExtraction);
  } else {
    initializeLinkExtraction();
  }

})();