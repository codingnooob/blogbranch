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
      console.log(`Blog Link Analyzer: Storing data for tab ${tabId}:`, {
        isBlog: data.isBlog,
        linkCount: data.blogLinks ? data.blogLinks.length : 0
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
        stack: error.stack
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

  // Handle messages from content scripts and popup
  function setupMessageListener() {
    getChromeAPI().runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Blog Link Analyzer: Received message:', message.type, 'from tab:', sender.tab?.id);
    
    (async () => {
      try {
        switch (message.type) {
          case 'BLOG_DETECTED':
            console.log('Blog Link Analyzer: Blog detected', message.payload);
            await storeBlogData(sender.tab.id, {
              isBlog: true,
              blogInfo: message.payload,
              blogLinks: []
            });
            sendResponse({ success: true });
            break;

          case 'BLOG_LINKS_EXTRACTED':
            console.log('Blog Link Analyzer: Links extracted', {
              linkCount: message.payload.blogLinks ? message.payload.blogLinks.length : 0,
              url: message.payload.url
            });
            
            const existingData = await getBlogData(sender.tab.id);
            await storeBlogData(sender.tab.id, {
              ...existingData,
              blogLinks: message.payload.blogLinks,
              lastExtraction: message.payload.timestamp
            });
            sendResponse({ success: true });
            break;

          case 'GET_BLOG_DATA':
            console.log('Blog Link Analyzer: Requesting blog data for tab:', message.tabId, 'from sender tab:', sender.tab?.id);
            const data = await getBlogData(message.tabId);
            console.log('Blog Link Analyzer: Retrieved blog data:', {
              hasData: !!data,
              isBlog: data?.isBlog,
              linkCount: data?.blogLinks ? data.blogLinks.length : 0,
              lastUpdated: data?.lastUpdated
            });
            sendResponse({ success: true, data: data });
            break;

          case 'FETCH_NESTED_LINKS':
            // This would be implemented for nested link expansion
            console.log('Blog Link Analyzer: Fetching nested links for:', message.url);
            const nestedData = await fetchNestedLinksForUrl(message.url);
            sendResponse({ success: true, data: nestedData });
            break;

          default:
            console.warn('Blog Link Analyzer: Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        console.error('Blog Link Analyzer: Message handling error:', {
          error: error.message,
          messageType: message.type,
          tabId: sender.tab?.id,
          stack: error.stack
        });
        sendResponse({ success: false, error: error.message });
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
          return {
            url: url,
            nestedLinks: result.data.blogLinks.slice(0, 10), // Limit nested results
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
    getChromeAPI().alarms.create('cleanup', { periodInMinutes: 30 });
    getChromeAPI().alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'cleanup') {
        cleanupOldData();
      }
    });
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
      
      console.log('Blog Link Analyzer: Service worker initialized successfully');
    } catch (error) {
      console.error('Blog Link Analyzer: Service worker initialization failed:', error);
    }
  }

  // Initialize when the script loads
  initializeServiceWorker();

})();