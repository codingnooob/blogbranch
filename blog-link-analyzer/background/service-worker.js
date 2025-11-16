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
          return {
            url: url,
            nestedLinks: [],
            message: 'No blog links found on nested page',
            timestamp: Date.now()
          };
        }
      } catch (messageError) {
        // Close the temporary tab if there was an error
        await api.tabs.remove(tab.id).catch(() => {});
        throw messageError;
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Error fetching nested links:', error);
      return {
        url: url,
        nestedLinks: [],
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  // Handle tab updates (re-run analysis when page changes)
  function setupTabListeners() {
    getChromeAPI().tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      // Clear existing data for this tab
      await storeBlogData(tabId, null);
      
      // Wait a bit for content scripts to run
      setTimeout(async () => {
        const data = await getBlogData(tabId);
        if (data && data.isBlog) {
          console.log('Blog Link Analyzer: Blog detected on updated tab', tab.url);
        }
        }, 2000);
      }
    });

    // Handle tab removal (clean up data)
    getChromeAPI().tabs.onRemoved.addListener(async (tabId) => {
      try {
        const api = getChromeAPI();
        const result = await api.storage.local.get([STORAGE_KEYS.BLOG_DATA]);
        const blogData = result[STORAGE_KEYS.BLOG_DATA] || {};
        delete blogData[tabId];
        await api.storage.local.set({
          [STORAGE_KEYS.BLOG_DATA]: blogData
        });
        console.log(`Blog Link Analyzer: Cleaned up data for tab ${tabId}`);
      } catch (error) {
        console.error('Blog Link Analyzer: Error cleaning up tab data:', error);
      }
    });
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