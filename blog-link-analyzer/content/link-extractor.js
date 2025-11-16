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
            // Convert to absolute URL
            const absoluteHref = new URL(href, window.location.href).href;
            blogLinks.push({
              id: `link-${index}`,
              href: absoluteHref,
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
      // Validate URL first
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }

      // Since we can't directly fetch due to CORS, we'll extract basic info from URL
      let urlObj;
      try {
        urlObj = new URL(url, window.location.href);
      } catch (urlError) {
        throw new Error(`Invalid URL format: ${urlError.message}`);
      }

      const pathSegments = urlObj.pathname.split('/').filter(segment => segment);
      
      // Safely get the last segment
      const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';
      
      // Generate a title from the URL slug with proper validation
      let title = 'Unknown Title';
      if (lastSegment && typeof lastSegment === 'string') {
        title = lastSegment
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .substring(0, 100); // Limit length
      }

      return {
        title: title,
        author: null,
        url: url,
        timestamp: Date.now(),
        extracted: true
      };
    } catch (error) {
      console.error('Blog Link Analyzer: Error fetching blog post metadata:', error);
      return {
        title: null,
        author: null,
        url: url || 'unknown',
        timestamp: Date.now(),
        extracted: false,
        error: error.message
      };
    }
  }

  // Extract metadata for all blog links
  async function extractAllBlogLinkMetadata() {
    try {
      const blogLinks = extractBlogLinks();
      console.log(`Blog Link Analyzer: Processing ${blogLinks.length} blog links for metadata`);
      
      const metadataPromises = blogLinks.map(async (link, index) => {
        try {
          // Validate link object
          if (!link || !link.href) {
            console.warn(`Blog Link Analyzer: Invalid link at index ${index}:`, link);
            return null;
          }

          if (link.isInternal) {
            // For internal links, we can try to extract more info
            const metadata = await fetchBlogPostMetadata(link.href);
            return {
              ...link,
              title: metadata.title || link.text || 'Unknown Title',
              author: metadata.author,
              extracted: metadata.extracted
            };
          } else {
            // For external links, use link text as title
            return {
              ...link,
              title: link.text || 'Unknown Title',
              author: null,
              extracted: false
            };
          }
        } catch (error) {
          console.error(`Blog Link Analyzer: Error processing link ${index}:`, error);
          return {
            ...link,
            title: link.text || 'Unknown Title',
            author: null,
            extracted: false,
            error: error.message
          };
        }
      });

      const results = await Promise.all(metadataPromises);
      const validResults = results.filter(link => link && link.title); // Filter out invalid links
      console.log(`Blog Link Analyzer: Successfully processed ${validResults.length} out of ${blogLinks.length} links`);
      return validResults;
    } catch (error) {
      console.error('Blog Link Analyzer: Critical error in extractAllBlogLinkMetadata:', error);
      return [];
    }
  }

  // Enhanced message sending with retry
  function sendMessageWithRetry(message, maxRetries = 3, delay = 500) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      function attemptSend() {
        attempts++;
        console.log(`Blog Link Analyzer: Link extractor - Sending message attempt ${attempts}/${maxRetries}:`, message.type);
        
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(message, (response) => {
              if (chrome.runtime.lastError) {
                console.error(`Blog Link Analyzer: Link extractor - Message attempt ${attempts} failed:`, chrome.runtime.lastError);
                
                if (attempts < maxRetries) {
                  setTimeout(attemptSend, delay * attempts);
                } else {
                  reject(new Error(`Failed after ${maxRetries} attempts: ${chrome.runtime.lastError.message}`));
                }
              } else {
                console.log(`Blog Link Analyzer: Link extractor - Message sent successfully on attempt ${attempts}:`, response);
                resolve(response);
              }
            });
          } else {
            reject(new Error('Chrome runtime not available'));
          }
        } catch (error) {
          console.error(`Blog Link Analyzer: Link extractor - Message attempt ${attempts} threw error:`, error);
          
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

  // Wait for blog detection to complete
  function waitForBlogDetection(timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      function checkDetection() {
        if (window.blogLinkAnalyzerData && window.blogLinkAnalyzerData.detectionComplete) {
          console.log('Blog Link Analyzer: Blog detection completed, proceeding with link extraction');
          resolve(window.blogLinkAnalyzerData);
        } else if (Date.now() - startTime > timeout) {
          console.warn('Blog Link Analyzer: Blog detection timeout, proceeding anyway');
          resolve(window.blogLinkAnalyzerData || { isBlog: false, detectionComplete: false });
        } else {
          setTimeout(checkDetection, 100);
        }
      }
      
      checkDetection();
    });
  }

  // Initialize link extraction with better timing coordination
  async function initializeLinkExtraction() {
    try {
      console.log('Blog Link Analyzer: Starting link extraction initialization...', {
        readyState: document.readyState,
        url: window.location.href,
        timestamp: Date.now()
      });
      
      // Wait for blog detection to complete
      const blogData = await waitForBlogDetection();
      
      if (blogData && blogData.isBlog) {
        console.log('Blog Link Analyzer: Extracting blog links...');
        
        try {
          const blogLinks = await extractAllBlogLinkMetadata();
          
          console.log(`Blog Link Analyzer: Found ${blogLinks.length} blog links`);

          // Update stored data with links
          window.blogLinkAnalyzerData = {
            ...window.blogLinkAnalyzerData,
            blogLinks: blogLinks,
            extractionComplete: true,
            extractionTimestamp: Date.now()
          };

          // Send message to background script with retry mechanism
          const message = {
            type: 'BLOG_LINKS_EXTRACTED',
            payload: {
              url: window.location.href,
              blogLinks: blogLinks,
              timestamp: Date.now()
            }
          };
          
          console.log('Blog Link Analyzer: Sending links message to background:', {
            type: message.type,
            linkCount: blogLinks.length,
            url: message.payload.url
          });
          
          sendMessageWithRetry(message).then((response) => {
            console.log('Blog Link Analyzer: Blog links message confirmed by background');
          }).catch((error) => {
            console.error('Blog Link Analyzer: Failed to send blog links message after retries:', error);
          });
          
        } catch (extractionError) {
          console.error('Blog Link Analyzer: Error during link extraction:', extractionError);
          
          // Store error state to prevent hanging
          window.blogLinkAnalyzerData = {
            ...window.blogLinkAnalyzerData,
            blogLinks: [],
            extractionComplete: true,
            extractionError: extractionError.message,
            extractionTimestamp: Date.now()
          };
        }
      } else {
        console.log('Blog Link Analyzer: Not a blog post, skipping link extraction');
        
        // Ensure extraction is marked as complete even for non-blogs
        window.blogLinkAnalyzerData = {
          ...window.blogLinkAnalyzerData,
          blogLinks: [],
          extractionComplete: true,
          extractionTimestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Critical error in link extraction:', error);
      
      // Store error state to prevent hanging
      window.blogLinkAnalyzerData = {
        isBlog: false,
        blogLinks: [],
        extractionComplete: true,
        criticalError: true,
        error: error.message,
        extractionTimestamp: Date.now()
      };
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