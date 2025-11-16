// Background Service Worker for Blog Link Analyzer
(function() {
  'use strict';

  // Import browser compatibility layer
  // Note: In a real extension, this would be imported as a separate file
  const chrome = typeof browser !== 'undefined' ? browser : chrome;

  // Storage keys
  const STORAGE_KEYS = {
    BLOG_DATA: 'blogLinkAnalyzer_data',
    USER_PREFERENCES: 'blogLinkAnalyzer_preferences',
    CACHE: 'blogLinkAnalyzer_cache'
  };

  // Initialize storage
  async function initializeStorage() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.BLOG_DATA]);
      if (!result[STORAGE_KEYS.BLOG_DATA]) {
        await chrome.storage.local.set({
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
      const result = await chrome.storage.local.get([STORAGE_KEYS.BLOG_DATA]);
      const blogData = result[STORAGE_KEYS.BLOG_DATA] || {};
      
      blogData[tabId] = {
        ...data,
        lastUpdated: Date.now()
      };

      await chrome.storage.local.set({
        [STORAGE_KEYS.BLOG_DATA]: blogData
      });

      console.log(`Blog Link Analyzer: Stored data for tab ${tabId}`);
    } catch (error) {
      console.error('Blog Link Analyzer: Error storing blog data:', error);
    }
  }

  // Get blog data for a tab
  async function getBlogData(tabId) {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.BLOG_DATA]);
      const blogData = result[STORAGE_KEYS.BLOG_DATA] || {};
      return blogData[tabId] || null;
    } catch (error) {
      console.error('Blog Link Analyzer: Error getting blog data:', error);
      return null;
    }
  }

  // Clean up old data (remove data for closed tabs)
  async function cleanupOldData() {
    try {
      const tabs = await chrome.tabs.query({});
      const activeTabIds = new Set(tabs.map(tab => tab.id));

      const result = await chrome.storage.local.get([STORAGE_KEYS.BLOG_DATA]);
      const blogData = result[STORAGE_KEYS.BLOG_DATA] || {};

      let cleaned = false;
      for (const tabId in blogData) {
        if (!activeTabIds.has(parseInt(tabId))) {
          delete blogData[tabId];
          cleaned = true;
        }
      }

      if (cleaned) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.BLOG_DATA]: blogData
        });
        console.log('Blog Link Analyzer: Cleaned up old data');
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Error cleaning up data:', error);
    }
  }

  // Handle messages from content scripts and popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
            console.log('Blog Link Analyzer: Links extracted', message.payload);
            const existingData = await getBlogData(sender.tab.id);
            await storeBlogData(sender.tab.id, {
              ...existingData,
              blogLinks: message.payload.blogLinks,
              lastExtraction: message.payload.timestamp
            });
            sendResponse({ success: true });
            break;

          case 'GET_BLOG_DATA':
            const data = await getBlogData(message.tabId);
            sendResponse({ success: true, data: data });
            break;

          case 'FETCH_NESTED_LINKS':
            // This would be implemented for nested link expansion
            const nestedData = await fetchNestedLinksForUrl(message.url);
            sendResponse({ success: true, data: nestedData });
            break;

          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        console.error('Blog Link Analyzer: Message handling error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Keep message channel open for async response
  });

  // Fetch nested links for a given URL
  async function fetchNestedLinksForUrl(url) {
    try {
      console.log('Blog Link Analyzer: Fetching nested links for', url);
      
      // Create a new tab to analyze the linked page
      const tab = await chrome.tabs.create({
        url: url,
        active: false
      });

      // Wait for the page to load and content scripts to run
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        // Get the blog data from the new tab
        const result = await chrome.tabs.sendMessage(tab.id, {
          type: 'GET_BLOG_LINKS'
        });

        // Close the temporary tab
        await chrome.tabs.remove(tab.id);

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
        await chrome.tabs.remove(tab.id).catch(() => {});
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
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
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
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.BLOG_DATA]);
      const blogData = result[STORAGE_KEYS.BLOG_DATA] || {};
      delete blogData[tabId];
      await chrome.storage.local.set({
        [STORAGE_KEYS.BLOG_DATA]: blogData
      });
      console.log(`Blog Link Analyzer: Cleaned up data for tab ${tabId}`);
    } catch (error) {
      console.error('Blog Link Analyzer: Error cleaning up tab data:', error);
    }
  });

  // Clean up old data periodically
  chrome.alarms.create('cleanup', { periodInMinutes: 30 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanup') {
      cleanupOldData();
    }
  });

  // Initialize on startup
  chrome.runtime.onStartup.addListener(async () => {
    console.log('Blog Link Analyzer: Service worker started');
    await initializeStorage();
    await cleanupOldData();
  });

  // Initialize on install
  chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Blog Link Analyzer: Extension installed/updated', details);
    await initializeStorage();
    
    if (details.reason === 'install') {
      // Show welcome message or set default preferences
      await chrome.storage.local.set({
        [STORAGE_KEYS.USER_PREFERENCES]: {
          maxLinks: 50,
          showExternalLinks: true,
          autoExpand: false
        }
      });
    }
  });

})();