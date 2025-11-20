// Background Service Worker for Blog Link Analyzer
(function() {
  'use strict';

  // Browser compatibility layer - safely get APIs
  function getChromeAPI() {
    if (typeof browser !== 'undefined' && browser.runtime) {
      return browser; // Firefox
    } else if (typeof chrome !== 'undefined' && chrome.runtime) {
      return chrome; // Chrome
    } else {
      throw new Error('Browser APIs not available');
    }
  }

  // Storage keys
  const STORAGE_KEYS = {
    BLOG_DATA: 'blogLinkAnalyzer_data',
    USER_PREFERENCES: 'blogLinkAnalyzer_preferences',
    CACHE: 'blogLinkAnalyzer_cache'
  };

  // Initialize storage
  async function initializeStorage() {
    try {
      const api = getChromeAPI();
      const result = await api.storage.local.get([STORAGE_KEYS.BLOG_DATA]);
      if (!result[STORAGE_KEYS.BLOG_DATA]) {
        await api.storage.local.set({
          [STORAGE_KEYS.BLOG_DATA]: {}
        });
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Storage initialization error:', error);
    }
  }

  // Store blog data for a tab
  async function storeBlogData(tabId, data) {
    try {
      // Handle null/undefined data
      if (!data) {
        console.log(`Blog Link Analyzer: No data to store for tab ${tabId}`);
        return;
      }

      console.log(`Blog Link Analyzer: Storing data for tab ${tabId}:`, {
        isBlog: data.isBlog,
        linkCount: data.blogLinks ? data.blogLinks.length : 0,
        dataType: typeof data
      });
      
      const api = getChromeAPI();
      const result = await api.storage.local.get([STORAGE_KEYS.BLOG_DATA]);
      const blogData = result[STORAGE_KEYS.BLOG_DATA] || {};
      
      blogData[tabId] = {
        ...data,
        lastUpdated: Date.now()
      };

      await api.storage.local.set({
        [STORAGE_KEYS.BLOG_DATA]: blogData
      });

      console.log(`Blog Link Analyzer: Successfully stored data for tab ${tabId}`);
    } catch (error) {
      console.error('Blog Link Analyzer: Error storing blog data:', {
        error: error.message,
        tabId: tabId,
        stack: error.stack,
        data: data ? 'present' : 'null/undefined'
      });
    }
  }

  // Get blog data for a tab
  async function getBlogData(tabId) {
    try {
      console.log(`Blog Link Analyzer: Getting blog data for tab ${tabId}`);
      
      const api = getChromeAPI();
      const result = await api.storage.local.get([STORAGE_KEYS.BLOG_DATA]);
      const blogData = result[STORAGE_KEYS.BLOG_DATA] || {};
      console.log(`Blog Link Analyzer: All stored blog data keys:`, Object.keys(blogData));
      console.log(`Blog Link Analyzer: Looking for tab ID: ${tabId}, available IDs:`, Object.keys(blogData).map(k => parseInt(k)));
      const data = blogData[tabId] || null;
      
      console.log(`Blog Link Analyzer: Retrieved blog data for tab ${tabId}:`, {
        hasData: !!data,
        isBlog: data?.isBlog,
        linkCount: data?.blogLinks ? data.blogLinks.length : 0,
        lastUpdated: data?.lastUpdated,
        dataKeys: data ? Object.keys(data) : null
      });
      
      return data;
    } catch (error) {
      console.error('Blog Link Analyzer: Error getting blog data:', {
        error: error.message,
        tabId: tabId,
        stack: error.stack
      });
      return null;
    }
  }

  // Clean up old data (remove data for closed tabs)
  async function cleanupOldData() {
    try {
      const api = getChromeAPI();
      const tabs = await api.tabs.query({});
      const activeTabIds = new Set(tabs.map(tab => tab.id));

      const result = await api.storage.local.get([STORAGE_KEYS.BLOG_DATA]);
      const blogData = result[STORAGE_KEYS.BLOG_DATA] || {};

      let cleaned = false;
      for (const tabId in blogData) {
        if (!activeTabIds.has(parseInt(tabId))) {
          delete blogData[tabId];
          cleaned = true;
        }
      }

      if (cleaned) {
        await api.storage.local.set({
          [STORAGE_KEYS.BLOG_DATA]: blogData
        });
        console.log('Blog Link Analyzer: Cleaned up old data');
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Error cleaning up data:', error);
    }
  }

  // Enhanced message handling with better logging and error recovery
  function setupMessageListener() {
    getChromeAPI().runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Update activity to keep service worker alive
      updateActivity();
      
      const messageId = `${message.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`Blog Link Analyzer: [${messageId}] Received message:`, {
        type: message.type,
        fromTab: sender.tab?.id,
        url: sender.tab?.url,
        timestamp: Date.now(),
        serviceWorkerActive: true
      });
    
    (async () => {
      try {
        switch (message.type) {
          case 'BLOG_DETECTED':
            console.log(`Blog Link Analyzer: [${messageId}] Processing blog detected:`, {
              tabId: sender.tab?.id,
              isBlog: message.payload?.isBlog,
              confidence: message.payload?.confidence,
              platform: message.payload?.platform
            });
            
            await storeBlogData(sender.tab.id, {
              isBlog: true,
              blogInfo: message.payload,
              blogLinks: [],
              detectionTimestamp: message.timestamp || Date.now()
            });
            
            console.log(`Blog Link Analyzer: [${messageId}] Blog detection data stored successfully`);
            sendResponse({ success: true, messageId });
            break;

          case 'BLOG_LINKS_EXTRACTED':
            const linkCount = message.payload?.blogLinks ? message.payload.blogLinks.length : 0;
            console.log(`Blog Link Analyzer: [${messageId}] Processing links extracted:`, {
              tabId: sender.tab?.id,
              linkCount: linkCount,
              url: message.payload?.url,
              timestamp: message.payload?.timestamp
            });
            
            const existingData = await getBlogData(sender.tab.id);
            const newData = {
              ...existingData,
              // Don't override isBlog if it already exists in existingData
              isBlog: existingData.isBlog !== undefined ? existingData.isBlog : (message.payload?.isBlog || false),
              confidence: message.payload?.confidence || existingData.confidence || 0,
              platform: message.payload?.platform || existingData.platform || 'unknown',
              url: message.payload?.url || sender.tab?.url,
              title: message.payload?.title || sender.tab?.title,
              blogLinks: message.payload.blogLinks || existingData.blogLinks || [],
              extractionComplete: true,
              extractionTimestamp: message.payload?.timestamp || Date.now()
            };
            
            // Only preserve detectionComplete if it actually exists in existingData
            if (existingData.detectionComplete !== undefined) {
              newData.detectionComplete = existingData.detectionComplete;
            }
            
            await storeBlogData(sender.tab.id, newData);
            
            console.log(`Blog Link Analyzer: [${messageId}] Links data stored successfully`);
            sendResponse({ success: true, messageId, linkCount });
            break;

          case 'GET_BLOG_DATA':
            console.log(`Blog Link Analyzer: [${messageId}] Processing blog data request:`, {
              requestedTabId: message.tabId,
              senderTabId: sender.tab?.id,
              timestamp: Date.now()
            });
            
            const data = await getBlogData(message.tabId);
            
            console.log(`Blog Link Analyzer: [${messageId}] Blog data retrieved:`, {
              hasData: !!data,
              isBlog: data?.isBlog,
              linkCount: data?.blogLinks ? data.blogLinks.length : 0,
              lastUpdated: data?.lastUpdated,
              extractionComplete: data?.extractionComplete,
              detectionComplete: data?.detectionComplete,
              allKeys: Object.keys(data || {}),
              detectionCompleteValue: data?.detectionComplete,
              detectionCompleteType: typeof data?.detectionComplete
            });
            
            // Add fallback data if nothing exists yet
            const responseData = data || {
              isBlog: false,
              blogLinks: [],
              extractionComplete: false,
              detectionComplete: false,
              fallbackData: true,
              message: 'No data available yet - content scripts may still be loading'
            };
            
            sendResponse({ success: true, data: responseData, messageId });
            break;

          case 'FETCH_NESTED_LINKS':
            console.log(`Blog Link Analyzer: [${messageId}] Processing nested links request:`, {
              url: message.url,
              timestamp: Date.now()
            });
            
            const nestedData = await fetchNestedLinksForUrl(message.url);
            
            console.log(`Blog Link Analyzer: [${messageId}] Nested links retrieved:`, {
              url: message.url,
              nestedLinkCount: nestedData?.nestedLinks ? nestedData.nestedLinks.length : 0,
              hasError: !!nestedData?.error
            });
            
            sendResponse({ success: true, data: nestedData, messageId });
            break;

          case 'KEEP_ALIVE':
            // Simple keep-alive message
            console.log(`Blog Link Analyzer: [${messageId}] Keep-alive received`);
            sendResponse({ success: true, messageId, timestamp: Date.now() });
            break;

          case 'FETCH_EXTERNAL_CONTENT':
            console.log(`Blog Link Analyzer: [${messageId}] Processing external content fetch:`, {
              url: message.url,
              timestamp: Date.now()
            });
            
            try {
              const contentData = await fetchExternalContentSimple(message.url);
              
              console.log(`Blog Link Analyzer: [${messageId}] External content fetched:`, {
                url: message.url,
                contentLength: contentData.text ? contentData.text.length : 0,
                hasTitle: !!contentData.title,
                hasAuthor: !!contentData.author,
                success: contentData.success
              });
              
              sendResponse({ success: true, data: contentData, messageId });
            } catch (error) {
              console.error(`Blog Link Analyzer: [${messageId}] External content fetch failed:`, error);
              sendResponse({ 
                success: false, 
                error: error.message, 
                messageId,
                url: message.url 
              });
            }
            break;

          default:
            console.warn(`Blog Link Analyzer: [${messageId}] Unknown message type:`, message.type);
            sendResponse({ success: false, error: 'Unknown message type', messageId });
        }
      } catch (error) {
        console.error(`Blog Link Analyzer: [${messageId}] Message handling error:`, {
          error: error.message,
          messageType: message.type,
          tabId: sender.tab?.id,
          stack: error.stack,
          timestamp: Date.now()
        });
        sendResponse({ success: false, error: error.message, messageId });
      }
    })();

      return true; // Keep message channel open for async response
    });
  }

  // Fetch nested links for a given URL
  async function fetchNestedLinksForUrl(url) {
    try {
      console.log('Blog Link Analyzer: Fetching nested links for', url);
      
      const api = getChromeAPI();
      // Create a new tab to analyze the linked page
      const tab = await api.tabs.create({
        url: url,
        active: false
      });

      // Wait for the page to load and content scripts to run
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        // Wait a bit longer for content scripts to inject
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the blog data from the new tab
        const result = await api.tabs.sendMessage(tab.id, {
          type: 'GET_BLOG_LINKS'
        });

        // Close the temporary tab
        await api.tabs.remove(tab.id);

        if (result && result.success && result.data && result.data.blogLinks) {
          const nestedLinks = result.data.blogLinks.slice(0, 50); // Increased limit for better exploration
          console.log(`Blog Link Analyzer: Found ${nestedLinks.length} nested links for ${url}`);
          return {
            url: url,
            nestedLinks: nestedLinks,
            timestamp: Date.now()
          };
        } else {
          console.log(`Blog Link Analyzer: No nested links found for ${url}`);
          return {
            url: url,
            nestedLinks: [],
            timestamp: Date.now()
          };
        }
      } catch (error) {
        console.error(`Blog Link Analyzer: Error fetching nested links for ${url}:`, error);
        // Ensure tab is closed even if error occurs
        try {
          await api.tabs.remove(tab.id);
        } catch (tabError) {
          // Tab might already be closed
        }
        return {
          url: url,
          nestedLinks: [],
          error: error.message,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error(`Blog Link Analyzer: Failed to create tab for ${url}:`, error);
      return {
        url: url,
        nestedLinks: [],
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  // Extract content from HTML using regex patterns (for background script)
  function extractContentFromHTMLSimple(html, url) {
    let title = '';
    let author = '';
    let publishDate = null;
    let text = '';

    try {
      // Extract title
      const titlePatterns = [
        /<title[^>]*>([^<]+)<\/title>/i,
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
        /<h2[^>]*>([^<]+)<\/h2>/i
      ];

      for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          title = match[1].trim();
          break;
        }
      }

      // Extract author
      const authorPatterns = [
        /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']article:author["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<[^>]*class=["'][^"']*author["'][^>]*>([^<]+)<\/[^>]*>/i,
        /<[^>]*class=["'][^"']*byline["'][^>]*>([^<]+)<\/[^>]*>/i
      ];

      for (const pattern of authorPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          author = match[1].trim();
          break;
        }
      }

      // Extract publish date
      const datePatterns = [
        /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']article:published_time["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+property=["']published_time["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<time[^>]+datetime=["']([^"']+)["'][^>]*>/i,
        /<[^>]*class=["'][^"']*date["'][^>]*>([^<]+)<\/[^>]*>/i
      ];

      for (const pattern of datePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const date = parseDateFromHTMLSimple(match[1]);
          if (date && !isNaN(date.getTime())) {
            publishDate = date;
            break;
          }
        }
      }

      // Extract main content - try multiple strategies
      const contentPatterns = [
        // Article tags (highest priority)
        /<article[^>]*>([\s\S]*?)<\/article>/gi,
        // Main content areas
        /<main[^>]*>([\s\S]*?)<\/main>/gi,
        // Common content class names (expanded list)
        /<[^>]*class=["'][^"']*content["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*post-content["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*entry-content["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*article-body["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*post-body["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*story-body["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*post["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*entry["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        // Medium-specific patterns
        /<[^>]*class=["'][^"']*article-content["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*section-content["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        // Dev.to and similar platforms
        /<[^>]*class=["'][^"']*article-body["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*body-content["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        // Generic text containers
        /<div[^>]*class=["'][^"']*text["'][^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*class=["'][^"']*description["'][^>]*>([\s\S]*?)<\/div>/gi,
        // LinkedIn and professional platforms
        /<[^>]*class=["'][^"']*article-text["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*post-text["'][^>]*>([\s\S]*?)<\/[^>]*>/gi
      ];

      for (const pattern of contentPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          // Clean each match and take the longest one
          for (const match of matches) {
            const cleanMatch = match
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
              .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
              .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
              .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
              .replace(/<[^>]*class=["'][^"']*advertisement["'][^>]*>[\s\S]*?<\/[^>]*>/gi, '')
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            if (cleanMatch.length > text.length) {
              text = cleanMatch;
            }
          }
          
          // If we found substantial content, break
          if (text.length > 200) {
            break;
          }
        }
      }

      // Fallback 1: extract all paragraph text with better filtering
      if (!text || text.trim().length < 100) {
        const paragraphMatches = html.match(/<p[^>]*>([^<]+)<\/p>/gi);
        if (paragraphMatches) {
          const paragraphText = paragraphMatches
            .map(p => p.replace(/<[^>]*>/g, '').trim())
            .filter(p => p.length > 15) // Increased minimum length
            .filter(p => !p.toLowerCase().includes('advertisement'))
            .filter(p => !p.toLowerCase().includes('sponsored'))
            .filter(p => !p.toLowerCase().includes('click here'))
            .filter(p => !p.match(/^\s*[\d\W]+\s*$/)) // Filter out navigation elements
            .join(' ');
          
          if (paragraphText.length > text.length) {
            text = paragraphText;
          }
        }
      }

      // Fallback 2: extract from common text containers
      if (!text || text.trim().length < 100) {
        const textContainerPatterns = [
          /<div[^>]*class=["'][^"']*text["'][^>]*>([\s\S]*?)<\/div>/gi,
          /<div[^>]*class=["'][^"']*description["'][^>]*>([\s\S]*?)<\/div>/gi,
          /<section[^>]*class=["'][^"']*content["'][^>]*>([\s\S]*?)<\/section>/gi
        ];

        for (const pattern of textContainerPatterns) {
          const matches = html.match(pattern);
          if (matches) {
            const containerText = matches
              .map(match => match
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim())
              .filter(text => text.length > 30)
              .join(' ');
            
            if (containerText.length > text.length) {
              text = containerText;
            }
          }
        }
      }

      // Final fallback: extract all text content with enhanced cleaning
      if (!text || text.trim().length < 50) {
        const cleanHtml = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
          .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
          .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '') // Remove SVG content
          .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '') // Remove iframes
          .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '') // Remove forms
          .replace(/<!--[\s\S]*?-->/g, ''); // Remove HTML comments
        
        const textMatches = cleanHtml.match(/<[^>]*>([^<]+)<\/[^>]*>/gi);
        if (textMatches) {
          const allText = textMatches
            .map(match => match.replace(/<[^>]*>/g, '').trim())
            .filter(text => text.length > 8) // Slightly higher threshold
            .filter(text => !text.match(/^\s*[\d\W]+\s*$/)) // Filter out navigation
            .filter(text => !text.toLowerCase().includes('cookie'))
            .filter(text => !text.toLowerCase().includes('privacy'))
            .filter(text => !text.toLowerCase().includes('terms'))
            .filter(text => !text.toLowerCase().includes('subscribe'))
            .join(' ')
            .substring(0, 15000); // Increased limit for better extraction
          
          if (allText.length > text.length) {
            text = allText;
          }
        }
      }

    } catch (error) {
      console.error('Error extracting content from HTML:', error);
    }

    return {
      title: title,
      author: author,
      publishDate: publishDate,
      text: text
    };
  }

  function cleanContentFromHTMLSimple(content) {
    if (!content) return '';

    return content
      // Remove HTML tags
      .replace(/<[^>]*>/g, ' ')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove newlines and tabs
      .replace(/[\n\t\r]/g, ' ')
      // Remove multiple spaces
      .replace(/ {2,}/g, ' ')
      // Trim
      .trim()
      // Limit length
      .substring(0, 50000);
  }

  function generateExcerptFromHTMLSimple(content) {
    if (!content) return '';
    return content.substring(0, 200) + (content.length > 200 ? '...' : '');
  }

  function countWordsFromHTMLSimple(content) {
    if (!content) return 0;
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  function parseDateFromHTMLSimple(dateStr) {
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  }

  // Fetch external content for summarization (simplified version)
  async function fetchExternalContentSimple(url) {
    try {
      console.log('Blog Link Analyzer: Fetching external content:', url);
      
      // Validate URL
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }

      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }

      // Fetch with proper headers
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Blog Link Analyzer Extension (AI Summarization)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive'
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Extract content using simplified approach for background script
      const content = extractContentFromHTMLSimple(html, url);
      
      // Clean and process content
      const cleanedContent = cleanContentFromHTMLSimple(content.text);
      
      return {
        url: url,
        title: content.title,
        author: content.author,
        publishDate: content.publishDate,
        text: cleanedContent,
        excerpt: generateExcerptFromHTMLSimple(cleanedContent),
        wordCount: countWordsFromHTMLSimple(cleanedContent),
        fetchedAt: new Date().toISOString(),
        success: true
      };

    } catch (error) {
      console.error(`Failed to fetch external content from ${url}:`, error);
      
      // Provide specific error messages
      let errorMessage = error.message;
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - page took too long to load';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error - unable to access page';
      } else if (error.message.includes('HTTP 403')) {
        errorMessage = 'Access forbidden - page may block automated access';
      } else if (error.message.includes('HTTP 404')) {
        errorMessage = 'Page not found - URL may be incorrect';
      } else if (error.message.includes('CORS') || error.message.includes('Content Security Policy')) {
        errorMessage = 'Access blocked by browser security policy - extension permissions may need to be updated';
      } else if (error.message.includes('connect-src')) {
        errorMessage = 'Content Security Policy violation - external domain not allowed';
      }
      
      return {
        url: url,
        error: errorMessage,
        success: false,
        fetchedAt: new Date().toISOString()
      };
    }
  }

  // Setup tab event listeners
  function setupTabListeners() {
    try {
      const api = getChromeAPI();
      if (api.tabs && api.tabs.onUpdated) {
        api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          if (changeInfo.status === 'complete' && tab.url) {
            console.log('Blog Link Analyzer: Tab updated:', tabId, tab.url);
            // Clear existing data for this tab when it navigates
            getBlogData(tabId).then(existingData => {
              if (existingData && existingData.url !== tab.url) {
                // Tab navigated to different URL, clear the data
                storeBlogData(tabId, null);
              }
            }).catch(error => {
              // Ignore errors, just continue
            });
          }
        });
        
        api.tabs.onRemoved.addListener((tabId) => {
          console.log('Blog Link Analyzer: Tab removed:', tabId);
          // Clean up data when tab is closed
          storeBlogData(tabId, null);
        });
        
        console.log('Blog Link Analyzer: Tab listeners setup successful');
      } else {
        console.log('Blog Link Analyzer: Tabs API not available, skipping tab listeners');
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Failed to setup tab listeners:', error);
    }
  }

  // Clean up old data periodically
  function setupAlarms() {
    try {
      const api = getChromeAPI();
      if (api.alarms) {
        api.alarms.create('cleanup', { periodInMinutes: 30 });
        api.alarms.onAlarm.addListener((alarm) => {
          if (alarm.name === 'cleanup') {
            cleanupOldData();
          }
        });
        console.log('Blog Link Analyzer: Alarms setup successful');
      } else {
        console.log('Blog Link Analyzer: Alarms API not available, skipping alarm setup');
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Failed to setup alarms:', error);
    }
  }

  // Initialize on startup
  function setupStartupListener() {
    getChromeAPI().runtime.onStartup.addListener(async () => {
      console.log('Blog Link Analyzer: Service worker started');
      await initializeStorage();
      await cleanupOldData();
    });
  }

  // Initialize on install
  function setupInstallListener() {
    getChromeAPI().runtime.onInstalled.addListener(async (details) => {
      console.log('Blog Link Analyzer: Extension installed/updated', details);
      await initializeStorage();
      
      if (details.reason === 'install') {
        // Show welcome message or set default preferences
        const api = getChromeAPI();
        await api.storage.local.set({
          [STORAGE_KEYS.USER_PREFERENCES]: {
            maxLinks: 50,
            showExternalLinks: true,
            autoExpand: false
          }
        });
      }
    });
  }

  // Keep-alive mechanism to prevent service worker inactivity
  let keepAliveInterval;
  let lastActivityTime = Date.now();

  function startKeepAlive() {
    console.log('Blog Link Analyzer: Starting keep-alive mechanism');
    
    // Clear any existing interval
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    
    // Set up keep-alive interval
    keepAliveInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime;
      
      console.log('Blog Link Analyzer: Keep-alive check:', {
        timeSinceLastActivity: timeSinceLastActivity + 'ms',
        lastActivity: new Date(lastActivityTime).toISOString()
      });
      
      // Update last activity time to keep service worker alive
      lastActivityTime = now;
      
      // Optionally perform a lightweight storage operation to maintain activity
      try {
        const api = getChromeAPI();
        api.storage.local.get(['keepAlive']).catch(() => {
          // Ignore errors, this is just to maintain activity
        });
      } catch (error) {
        // Ignore errors
      }
    }, 20000); // Every 20 seconds
  }

  function updateActivity() {
    lastActivityTime = Date.now();
    console.log('Blog Link Analyzer: Activity updated:', new Date(lastActivityTime).toISOString());
  }

  // Clean up old data
  async function cleanupOldData() {
    try {
      const api = getChromeAPI();
      const result = await api.storage.local.get([STORAGE_KEYS.BLOG_DATA]);
      const blogData = result[STORAGE_KEYS.BLOG_DATA] || {};
      
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      let cleanedCount = 0;
      
      for (const [tabId, data] of Object.entries(blogData)) {
        if (data && data.timestamp && (now - data.timestamp > maxAge)) {
          delete blogData[tabId];
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        await api.storage.local.set({
          [STORAGE_KEYS.BLOG_DATA]: blogData
        });
        console.log(`Blog Link Analyzer: Cleaned up ${cleanedCount} old data entries`);
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Failed to cleanup old data:', error);
    }
  }

  // Main initialization function
  function initializeServiceWorker() {
    try {
      console.log('Blog Link Analyzer: Initializing service worker...');
      
      // Check if APIs are available before setting up listeners
      if (typeof chrome === 'undefined' && typeof browser === 'undefined') {
        console.error('Blog Link Analyzer: Browser APIs not available during initialization');
        return;
      }
      
      // Setup all event listeners with error handling
      try {
        setupMessageListener();
        console.log('Blog Link Analyzer: Message listener setup complete');
      } catch (error) {
        console.error('Blog Link Analyzer: Failed to setup message listener:', error);
      }
      
      try {
        setupTabListeners();
        console.log('Blog Link Analyzer: Tab listeners setup complete');
      } catch (error) {
        console.error('Blog Link Analyzer: Failed to setup tab listeners:', error);
      }
      
      try {
        setupAlarms();
        console.log('Blog Link Analyzer: Alarms setup complete');
      } catch (error) {
        console.error('Blog Link Analyzer: Failed to setup alarms:', error);
      }
      
      try {
        setupStartupListener();
        console.log('Blog Link Analyzer: Startup listener setup complete');
      } catch (error) {
        console.error('Blog Link Analyzer: Failed to setup startup listener:', error);
      }
      
      try {
        setupInstallListener();
        console.log('Blog Link Analyzer: Install listener setup complete');
      } catch (error) {
        console.error('Blog Link Analyzer: Failed to setup install listener:', error);
      }
      
      // Start keep-alive mechanism
      startKeepAlive();
      
      console.log('Blog Link Analyzer: Service worker initialized successfully');
    } catch (error) {
      console.error('Blog Link Analyzer: Service worker initialization failed:', error);
    }
  }

  // Initialize when the script loads
  initializeServiceWorker();

})();