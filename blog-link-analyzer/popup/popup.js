// Blog Link Analyzer Popup Script - Fixed Version
(function() {
  'use strict';
  
  // IMMEDIATE DEBUGGING - This should appear immediately when popup opens
  console.log('=== BLOG LINK ANALYZER POPUP START ===');
  console.log('Blog Link Analyzer: Popup script loaded - START');
  console.log('Blog Link Analyzer: Document ready state:', document.readyState);
  console.log('Blog Link Analyzer: Has body:', !!document.body);
  console.log('Blog Link Analyzer: Document URL:', window.location.href);
  
  // IMMEDIATE VISUAL TEST - Hide test loading and show real popup
  try {
    const testLoading = document.getElementById('test-loading');
    const popupContainer = document.querySelector('.popup-container');
    if (testLoading) testLoading.style.display = 'none';
    if (popupContainer) popupContainer.style.display = 'block';
    console.log('Blog Link Analyzer: Visual test passed - showing real popup');
  } catch (e) {
    console.error('Blog Link Analyzer: Visual test failed:', e);
  }
  
  // Try to log some basic DOM elements
  try {
    console.log('Blog Link Analyzer: Document elements count:', document.querySelectorAll('*').length);
    console.log('Blog Link Analyzer: Has settings-button:', !!document.getElementById('settings-button'));
    console.log('Blog Link Analyzer: Has loading-section:', !!document.getElementById('loading-section'));
  } catch (e) {
    console.error('Blog Link Analyzer: Error checking DOM:', e);
  }

  // State management
  let currentTabId = null;
  let blogData = null;
  let filteredLinks = [];
  let expandedItems = new Set();
  let isInitialized = false;
  
  // Enhanced state for nested navigation
  let navigationStack = [];
  let currentDepth = 0;
  let currentParentLink = null;
  let nestedLinkCache = new Map(); // Cache for fetched nested links
  
  // AI Feature State
  let aiService = null;
  let storageManager = null;
  let contentFetcher = null;
  let aiSettings = null;
  let currentSummaryRequest = null;
  
  // Regenerate Summary Context
  let currentSummaryContext = {
    link: null,
    content: null,
    metadata: null,
    isCurrentPage: false
  };
  
  // Configuration
  const CONFIG = {
    MAX_DEPTH: 25, // Default maximum nesting depth (user configurable)
    MAX_CACHE_SIZE: 200, // Maximum number of cached nested link sets
    MAX_VISIBLE_LINKS: 100, // Maximum links to show at once for performance
    NESTED_LINKS_LIMIT: 50, // Maximum nested links to fetch per page
    REQUEST_TIMEOUT: 8000, // Reduced timeout for faster feedback
    MAX_CONCURRENT_REQUESTS: 3 // Maximum concurrent nested link requests
  };

  // Request management
  let activeRequests = new Set();
  let requestQueue = [];
  let isProcessingQueue = false;

  // DOM elements with enhanced diagnostics
  const elements = {};
  
  // Helper function to get element with logging
  function getElementWithLog(id) {
    const element = document.getElementById(id);
    console.log(`Blog Link Analyzer: Element ${id}:`, element ? 'found' : 'NOT FOUND');
    return element;
  }

  // Check if Chrome APIs are available
  function isChromeAPIAvailable() {
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.runtime.id && 
           chrome.tabs;
  }

  // Wait for Chrome APIs to be ready
  function waitForChromeAPI(timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      function checkAPI() {
        if (isChromeAPIAvailable()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Chrome APIs not available after timeout'));
        } else {
          setTimeout(checkAPI, 100);
        }
      }
      
      checkAPI();
    });
  }

  // Get Chrome API with fallback
  function getChromeAPI() {
    if (typeof browser !== 'undefined' && browser.runtime) {
      return browser; // Firefox
    } else if (typeof chrome !== 'undefined' && chrome.runtime) {
      return chrome; // Chrome
    } else {
      throw new Error('Browser APIs not available');
    }
  }

  // Performance monitoring
  const performanceMetrics = {
    startTime: performance.now(),
    apiCheckTime: 0,
    tabQueryTime: 0,
    dataLoadTime: 0,
    renderTime: 0
  };

  // Send keep-alive message to background to ensure service worker is active
  async function sendKeepAlive() {
    try {
      const chromeAPI = getChromeAPI();
      await chromeAPI.runtime.sendMessage({ type: 'KEEP_ALIVE' });
      console.log('Blog Link Analyzer: [POPUP] Keep-alive sent successfully');
    } catch (error) {
      console.log('Blog Link Analyzer: [POPUP] Keep-alive failed:', error.message);
    }
  }

  // Enhanced message sending with queuing and deduplication
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        const chromeAPI = getChromeAPI();
        const requestId = `${message.type}_${Date.now()}_${Math.random()}`;
        
        // Add to active requests
        activeRequests.add(requestId);
        
        console.log(`Blog Link Analyzer: [POPUP] Sending message ${requestId}:`, {
          type: message.type,
          tabId: message.tabId,
          url: message.url,
          timestamp: Date.now(),
          chromeAPIAvailable: !!chromeAPI,
          runtimeAvailable: !!(chromeAPI && chromeAPI.runtime),
          runtimeId: chromeAPI?.runtime?.id
        });
        
        // Check if runtime is available before sending
        if (!chromeAPI || !chromeAPI.runtime) {
          const error = new Error('Chrome runtime not available');
          console.error(`Blog Link Analyzer: [POPUP] Chrome runtime check failed:`, {
            chromeAPI: !!chromeAPI,
            runtime: !!(chromeAPI && chromeAPI.runtime),
            id: chromeAPI?.runtime?.id
          });
          activeRequests.delete(requestId);
          reject(error);
          return;
        }
        
        chromeAPI.runtime.sendMessage(message, (response) => {
          activeRequests.delete(requestId);
          
          if (chromeAPI.runtime.lastError) {
            const error = new Error(chromeAPI.runtime.lastError.message);
            error.code = chromeAPI.runtime.lastError.code;
            console.error(`Blog Link Analyzer: [POPUP] Message ${requestId} failed:`, {
              error: chromeAPI.runtime.lastError,
              messageType: message.type,
              tabId: message.tabId,
              requestId: requestId
            });
            reject(error);
          } else {
            console.log(`Blog Link Analyzer: [POPUP] Message ${requestId} completed:`, {
              response: response,
              messageType: message.type,
              tabId: message.tabId,
              requestId: requestId
            });
            resolve(response);
          }
        });
      } catch (error) {
        console.error(`Blog Link Analyzer: [POPUP] Failed to send message:`, {
          error: error.message,
          stack: error.stack,
          messageType: message.type,
          tabId: message.tabId
        });
        reject(new Error(`Failed to send message: ${error.message}`));
      }
    });
  }

  // Fallback: Direct storage access when background communication fails
  async function getBlogDataFromStorage(tabId) {
    try {
      console.log('Blog Link Analyzer: [FALLBACK] Attempting direct storage access...');
      
      const chromeAPI = getChromeAPI();
      const result = await chromeAPI.storage.local.get(['blogLinkAnalyzer_data']);
      const blogData = result.blogLinkAnalyzer_data || {};
      
      console.log('Blog Link Analyzer: [FALLBACK] Storage data retrieved:', {
        hasData: !!blogData,
        tabIds: Object.keys(blogData),
        requestedTabId: tabId,
        requestedTabIdType: typeof tabId,
        foundTabData: !!blogData[tabId],
        availableData: Object.keys(blogData).map(id => ({
          tabId: id,
          tabIdType: typeof id,
          hasData: !!blogData[id],
          linkCount: blogData[id]?.blogLinks?.length || 0,
          isBlog: blogData[id]?.isBlog
        }))
      });
      
      const data = blogData[tabId] || null;
      
      if (data) {
        console.log('Blog Link Analyzer: [FALLBACK] Found data for tab:', {
          isBlog: data.isBlog,
          linkCount: data.blogLinks ? data.blogLinks.length : 0,
          lastUpdated: data.lastUpdated,
          extractionComplete: data.extractionComplete,
          detectionComplete: data.detectionComplete
        });
      } else {
        console.log('Blog Link Analyzer: [FALLBACK] No data found for tab, checking for similar IDs...');
        
        // Try to find data with similar tab ID (in case of type mismatch)
        const numericTabId = parseInt(tabId);
        const stringTabId = tabId.toString();
        
        if (blogData[numericTabId]) {
          console.log('Blog Link Analyzer: [FALLBACK] Found data with numeric tab ID:', numericTabId);
          return blogData[numericTabId];
        } else if (blogData[stringTabId]) {
          console.log('Blog Link Analyzer: [FALLBACK] Found data with string tab ID:', stringTabId);
          return blogData[stringTabId];
        } else {
          // Try to find the most recent tab data as last resort
          const tabIds = Object.keys(blogData).map(id => parseInt(id));
          const recentTabIds = tabIds.sort((a, b) => {
            const dataA = blogData[a];
            const dataB = blogData[b];
            return (dataB?.lastUpdated || 0) - (dataA?.lastUpdated || 0);
          });
          
          console.log('Blog Link Analyzer: [FALLBACK] Trying most recent tab data:', {
            availableTabIds: tabIds,
            recentTabIds: recentTabIds.slice(-3), // Last 3 tabs
            requestedTabId: tabId
          });
          
          // Try to most recent tabs
          for (const recentTabId of recentTabIds.slice(-3).reverse()) {
            const recentData = blogData[recentTabId];
            if (recentData && recentData.blogLinks && recentData.blogLinks.length > 0) {
              console.log('Blog Link Analyzer: [FALLBACK] Using recent tab data:', recentTabId);
              return recentData;
            }
          }
        }
      }
      
      return data;
    } catch (error) {
      console.error('Blog Link Analyzer: [FALLBACK] Storage access failed:', error);
      return null;
    }
  }

  // Enhanced blog data loading with multiple retries and fallback storage access
  async function loadBlogData() {
    console.log('Blog Link Analyzer: Starting to load blog data...', {
      tabId: currentTabId,
      timestamp: Date.now()
    });
    showLoading('Analyzing page for blog posts...', true);

    let maxRetries = 3;
    const retryDelays = [1000, 2000, 3000]; // Progressive delays
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let loadingTimeout;
      
      try {
        console.log(`Blog Link Analyzer: Data loading attempt ${attempt}/${maxRetries}`);
        
        // Update progress
        updateProgress((attempt - 1) * 25, `Attempt ${attempt} of ${maxRetries}...`);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          loadingTimeout = setTimeout(() => {
            reject(new Error(`Data loading timeout after ${CONFIG.REQUEST_TIMEOUT/1000} seconds (attempt ${attempt})`));
          }, CONFIG.REQUEST_TIMEOUT);
        });

        console.log(`Blog Link Analyzer: [POPUP] Requesting blog data for tab ID: ${currentTabId} (attempt ${attempt})`);
        console.log(`Blog Link Analyzer: [POPUP] Tab details:`, {
          requestedTabId: currentTabId,
          tabIdType: typeof currentTabId,
          timestamp: Date.now()
        });
        updateProgress((attempt - 1) * 25 + 10, 'Requesting data from background...');
        
        const dataPromise = sendMessage({
          type: 'GET_BLOG_DATA',
          tabId: currentTabId,
          timestamp: Date.now(), // Cache-busting
          forceRefresh: true // Signal to get fresh data
        });

        const response = await Promise.race([dataPromise, timeoutPromise]);
        clearTimeout(loadingTimeout);

        console.log(`Blog Link Analyzer: [POPUP] Received response on attempt ${attempt}:`, {
          success: response?.success,
          hasData: !!response?.data,
          isBlog: response?.data?.isBlog,
          linkCount: response?.data?.blogLinks?.length || 0,
          isFallback: response?.data?.fallbackData,
          extractionComplete: response?.data?.extractionComplete,
          detectionComplete: response?.data?.detectionComplete,
          fullResponse: response
        });

        updateProgress((attempt - 1) * 25 + 20, 'Processing response...');

        if (response && response.success && response.data) {
          blogData = response.data;
          

          
          // Force fresh data on first successful response
          if (response.data.blogLinks && response.data.blogLinks.length > 0) {
            console.log('Blog Link Analyzer: [POPUP] Got fresh data with links, stopping retries');
            // Don't retry anymore - we have good data
            maxRetries = 1; // This will exit the retry loop
          }
          
          // Check if we should wait for content scripts to finish
          if (!blogData.extractionComplete || !blogData.detectionComplete) {
            console.log(`Blog Link Analyzer: Content scripts not finished on attempt ${attempt}, checking if we should retry...`);
            updateProgress((attempt - 1) * 25 + 25, 'Waiting for content scripts to finish...');
            
            if (attempt < maxRetries) {
              console.log(`Blog Link Analyzer: Will retry after ${retryDelays[attempt - 1]}ms`);
              updateProgress((attempt - 1) * 25 + 30, `Retrying in ${retryDelays[attempt - 1] / 1000} seconds...`);
              await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]));
              continue;
            } else {
              console.log('Blog Link Analyzer: Max retries reached, proceeding with available data');
              updateProgress(90, 'Proceeding with available data...');
            }
          }
          
          updateProgress(100, 'Loading complete!');
          
          console.log('Blog Link Analyzer: Blog data loaded successfully:', {
            isBlog: blogData.isBlog,
            linkCount: blogData.blogLinks ? blogData.blogLinks.length : 0,
            extractionComplete: blogData.extractionComplete,
            detectionComplete: blogData.detectionComplete
          });
          
          // Small delay to show completion
          await new Promise(resolve => setTimeout(resolve, 500));
          displayResults();
          return; // Success, exit the retry loop
        } else {
          console.log(`Blog Link Analyzer: No blog data found on attempt ${attempt}`);
          
          if (attempt === maxRetries) {
            showNoResults('No blog data found for this page after multiple attempts.');
            return;
          }
        }
      } catch (error) {
        clearTimeout(loadingTimeout);
        console.error(`Blog Link Analyzer: Error loading blog data on attempt ${attempt}:`, error);
        
        // Try fallback storage access on final attempt or for specific errors
        if (attempt === maxRetries || 
            error.message.includes('message channel') || 
            error.message.includes('Could not establish connection') ||
            error.message.includes('Chrome runtime not available')) {
          
          console.log('Blog Link Analyzer: Trying fallback storage access...');
          updateProgress((attempt - 1) * 25 + 15, 'Trying fallback storage access...');
          
          const fallbackData = await getBlogDataFromStorage(currentTabId);
          
          if (fallbackData) {
            console.log('Blog Link Analyzer: Fallback data found, using it');
            updateProgress(100, 'Loading complete from fallback!');
            blogData = fallbackData;
            await new Promise(resolve => setTimeout(resolve, 500));
            displayResults();
            return;
          } else {
            console.log('Blog Link Analyzer: No fallback data available');
          }
        }
        
        if (attempt === maxRetries) {
          console.log('Blog Link Analyzer: Max retries reached, showing error');
          
          // Provide more helpful error messages based on error type
          let errorMessage = 'Failed to load blog data';
          if (error.message.includes('timeout')) {
            errorMessage = 'Loading timed out - page may be slow or content scripts failed to initialize';
          } else if (error.message.includes('message channel')) {
            errorMessage = 'Communication error - try refreshing the page and reopening the extension';
          } else if (error.message.includes('Could not establish connection')) {
            errorMessage = 'Extension connection error - try restarting your browser';
          } else if (error.message.includes('Chrome runtime not available')) {
            errorMessage = 'Extension runtime error - please reload the extension';
          }
          
          showError(`${errorMessage}: ${error.message}`, {
            errorType: error.name,
            attempts: maxRetries,
            tabId: currentTabId,
            timestamp: Date.now(),
            fallbackAttempted: true
          });
          return;
        }
        
        // Wait before retrying
        console.log(`Blog Link Analyzer: Will retry after ${retryDelays[attempt - 1]}ms`);
        updateProgress((attempt - 1) * 25 + 25, `Error occurred, retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]));
      }
    }
  }

  // Show loading state with progress
  function showLoading(message = 'Analyzing page for blog posts...', showProgress = false) {
    hideAllSections();
    elements.loadingSection.style.display = 'block';
    
    // Update loading text
    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
      loadingText.textContent = message;
    }
    
    // Show/hide progress section
    const progressSection = document.getElementById('loading-progress');
    if (progressSection) {
      progressSection.style.display = showProgress ? 'block' : 'none';
    }
    
    // Reset progress
    updateProgress(0, 'Initializing...');
  }

  // Update progress bar
  function updateProgress(percent, text) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
      progressFill.style.width = `${percent}%`;
    }
    
    if (progressText) {
      progressText.textContent = text;
    }
  }

  // Update current page display
  function updateCurrentPageDisplay(url, title) {
    const pageIndicator = elements.currentPage.querySelector('.page-indicator');
    const hostname = new URL(url).hostname;
    pageIndicator.textContent = `${hostname} - ${title.substring(0, 30)}${title.length > 30 ? '...' : ''}`;
  }

  // Initialize popup with proper error handling and performance monitoring
  async function initializePopup() {
    try {
      console.log('Blog Link Analyzer: Starting popup initialization...');
      performanceMetrics.startTime = performance.now();
      
      // Send keep-alive to wake up service worker
      await sendKeepAlive();
      
      // Initialize AI services
      await initializeAIServices();
      
      // Initialize elements first - use the global elements object
      initializeElements();
      
      // Initialize AI status banner after elements are ready
      if (aiService && storageManager) {
        await initializeAIStatusBanner();
      }
      
      // Check if critical elements are found
      const criticalElements = ['settingsButton', 'loadingSection', 'linksSection', 'errorSection'];
      const missingCritical = criticalElements.filter(id => !elements[id]);
      
      if (missingCritical.length > 0) {
        console.error('Blog Link Analyzer: Missing critical elements:', missingCritical);
        throw new Error(`Required DOM elements not found: ${missingCritical.join(', ')}`);
      }
      
      // Wait for Chrome APIs to be available
      const apiStart = performance.now();
      await waitForChromeAPI();
      performanceMetrics.apiCheckTime = performance.now() - apiStart;
      
      const chromeAPI = getChromeAPI();
      console.log('Blog Link Analyzer: Chrome APIs available');

      // Get current tab with error handling
      let tabs;
      const tabStart = performance.now();
      try {
        tabs = await chromeAPI.tabs.query({ active: true, currentWindow: true });
      } catch (error) {
        throw new Error(`Failed to get current tab: ${error.message}`);
      }
      performanceMetrics.tabQueryTime = performance.now() - tabStart;

      if (!tabs || tabs.length === 0) {
        throw new Error('No active tab found');
      }

      const tab = tabs[0];
      currentTabId = tab.id;
      console.log(`Blog Link Analyzer: [POPUP] Current tab details:`, {
        tabId: currentTabId,
        url: tab.url,
        title: tab.title,
        active: tab.active,
        windowId: tab.windowId,
        timestamp: Date.now()
      });
      
      // Verify tab is actually the active one and get fresh data
      console.log(`Blog Link Analyzer: [POPUP] Verifying tab is current and active:`, {
        requestedTabId: currentTabId,
        tabUrl: tab.url,
        tabActive: tab.active,
        timestamp: Date.now()
      });

      // Update current page display
      updateCurrentPageDisplay(tab.url, tab.title);

      // Load blog data for current tab
      const dataStart = performance.now();
      await loadBlogData();
      performanceMetrics.dataLoadTime = performance.now() - dataStart;

      // Set up event listeners
      setupEventListeners();
      
      isInitialized = true;
      const totalTime = performance.now() - performanceMetrics.startTime;
      console.log('Blog Link Analyzer: Popup initialization complete', {
        totalTime: Math.round(totalTime) + 'ms',
        metrics: performanceMetrics
      });

    } catch (error) {
      console.error('Blog Link Analyzer: Popup initialization error:', error);
      
      // Enhanced error reporting
      const errorInfo = {
        type: error.name || 'InitializationError',
        message: error.message,
        stack: error.stack,
        chromeAvailable: isChromeAPIAvailable(),
        performance: performanceMetrics,
        timestamp: Date.now()
      };
      
      console.error('Blog Link Analyzer: Error details:', errorInfo);
      showError(`Failed to initialize popup: ${error.message}`, errorInfo);
    }
  }

  // Display results with enhanced fallback handling
  function displayResults() {
    console.log('Blog Link Analyzer: [POPUP] Displaying results...', {
      hasBlogData: !!blogData,
      hasBlogLinks: !!(blogData && blogData.blogLinks),
      linkCount: blogData && blogData.blogLinks ? blogData.blogLinks.length : 0,
      isBlog: blogData?.isBlog,
      extractionComplete: blogData?.extractionComplete,
      detectionComplete: blogData?.detectionComplete,
      isFallback: blogData?.fallbackData,
      fullBlogData: blogData
    });

    // Handle fallback data or incomplete processing
    if (blogData?.fallbackData) {
      console.log('Blog Link Analyzer: Showing fallback data message');
      showNoResults(blogData.message || 'Content scripts are still loading. Please try again in a moment.');
      return;
    }

    // Handle incomplete processing - but be more lenient if we have actual blog links
    const hasBlogLinks = blogData?.blogLinks && blogData.blogLinks.length > 0;
    const isMissingFlags = !blogData?.extractionComplete || !blogData?.detectionComplete;
    
    if (isMissingFlags && !hasBlogLinks) {
      console.log('Blog Link Analyzer: [POPUP] Showing incomplete processing message');
      console.log('Blog Link Analyzer: [POPUP] Incomplete details:', {
        extractionComplete: blogData?.extractionComplete,
        detectionComplete: blogData?.detectionComplete,
        isBlog: blogData?.isBlog,
        linkCount: blogData?.blogLinks?.length || 0
      });
      showNoResults(`Content analysis incomplete. Extraction: ${blogData?.extractionComplete}, Detection: ${blogData?.detectionComplete}, Blog: ${blogData?.isBlog}, Links: ${blogData?.blogLinks?.length || 0}`);
      return;
    }
    
    // If we have blog links but missing flags, show them anyway with a warning
    if (isMissingFlags && hasBlogLinks) {
      console.log('Blog Link Analyzer: [POPUP] Showing results despite missing flags (have actual links)');
    }

    // Handle non-blog pages
    if (!blogData?.isBlog) {
      console.log('Blog Link Analyzer: Showing non-blog page message');
      showNoResults('This page doesn\'t appear to be a blog post. Try opening a blog post and then use the extension.');
      return;
    }

    // Handle no blog links found
    if (!blogData.blogLinks || blogData.blogLinks.length === 0) {
      console.log('Blog Link Analyzer: Showing no results message');
      showNoResults('No blog post links found on this page. This might be a standalone blog post without related links.');
      return;
    }

    // Success case - we have blog links to display
    console.log('Blog Link Analyzer: Showing results with', blogData.blogLinks.length, 'links');
    hideAllSections();
    elements.linksSection.style.display = 'block';

    // Initialize navigation state
    navigateToRoot();
    
    // Update counts
    elements.linkCount.textContent = blogData.blogLinks.length;
    
    // Show current page summary button if AI is available
    if (aiService && storageManager) {
      showCurrentPageSummaryButton();
    }
    
    // Apply initial filters
    applyFilters();
  }

  // Apply filters and search
  function applyFilters() {
    if (!blogData || !blogData.blogLinks) return;

    const searchTerm = elements.searchInput.value.toLowerCase();
    const showInternalOnly = elements.showInternalOnly.checked;
    const showExtractedOnly = elements.showExtractedOnly.checked;

    filteredLinks = blogData.blogLinks.filter(link => {
      // Search filter
      const matchesSearch = !searchTerm || 
        (link.title && link.title.toLowerCase().includes(searchTerm)) ||
        (link.author && link.author.toLowerCase().includes(searchTerm)) ||
        (link.text && link.text.toLowerCase().includes(searchTerm));

      // Internal only filter
      const matchesInternal = !showInternalOnly || link.isInternal;

      // Extracted only filter
      const matchesExtracted = !showExtractedOnly || link.extracted;

      return matchesSearch && matchesInternal && matchesExtracted;
    });

    elements.filteredCount.textContent = filteredLinks.length;
    renderBlogLinks();
  }

  // Render blog links with performance optimization
  function renderBlogLinks() {
    const renderStart = performance.now();
    
    // Clear existing content
    while (elements.blogLinks.firstChild) {
      elements.blogLinks.removeChild(elements.blogLinks.firstChild);
    }

    if (filteredLinks.length === 0) {
      const noResultsDiv = document.createElement('div');
      noResultsDiv.className = 'no-filtered-results';
      noResultsDiv.textContent = 'No links match current filters.';
      elements.blogLinks.appendChild(noResultsDiv);
      return;
    }

    // Apply performance limit
    const linksToRender = filteredLinks.slice(0, CONFIG.MAX_VISIBLE_LINKS);
    if (filteredLinks.length > CONFIG.MAX_VISIBLE_LINKS) {
      console.log(`Blog Link Analyzer: Limiting display to ${CONFIG.MAX_VISIBLE_LINKS} of ${filteredLinks.length} links for performance`);
    }

    const template = document.getElementById('blog-link-template');
    const fragment = document.createDocumentFragment();
    
    // Batch DOM operations for better performance
    linksToRender.forEach((link, index) => {
      const clone = template.content.cloneNode(true);
      const item = clone.querySelector('.blog-link-item');
      
      // Set data attributes
      item.dataset.linkId = link.id;
      item.dataset.href = link.href;
      item.dataset.confidence = link.confidence;

      // Set content with sanitization
      const titleElement = clone.querySelector('.link-title');
      const title = (link.title || link.text || 'Unknown Title').substring(0, 100);
      titleElement.textContent = title;
      titleElement.title = title;

      const authorElement = clone.querySelector('.link-author');
      if (link.author) {
        authorElement.textContent = `By ${link.author.substring(0, 50)}`;
      } else {
        authorElement.style.display = 'none';
      }

      const confidenceElement = clone.querySelector('.link-confidence');
      confidenceElement.textContent = `${Math.round(link.confidence * 100)}%`;

      const typeElement = clone.querySelector('.link-type');
      typeElement.textContent = link.isInternal ? 'Internal' : 'External';

      // Set up expand button
      const expandButton = clone.querySelector('.expand-button');
      const depthLimit = CONFIG.MAX_DEPTH === Infinity ? 'unlimited' : CONFIG.MAX_DEPTH;
      if (link.isInternal && (CONFIG.MAX_DEPTH === Infinity || currentDepth < CONFIG.MAX_DEPTH)) {
        expandButton.addEventListener('click', () => toggleNestedLinks(link.id, expandButton));
        expandButton.title = `Show nested links from "${link.title || link.text}" (depth: ${currentDepth + 1}/${depthLimit})`;
      } else {
        expandButton.style.display = 'none';
        if (link.isInternal && CONFIG.MAX_DEPTH !== Infinity && currentDepth >= CONFIG.MAX_DEPTH) {
          // Add depth limit indicator
          const depthIndicator = document.createElement('span');
          depthIndicator.className = 'depth-limit-indicator';
          depthIndicator.textContent = ` (max depth ${CONFIG.MAX_DEPTH} reached)`;
          depthIndicator.style.cssText = `
            font-size: 11px;
            color: #666;
            font-style: italic;
            margin-left: 4px;
          `;
          clone.querySelector('.link-actions').appendChild(depthIndicator);
        }
      }

      // Set up summarize button
      const summarizeButton = clone.querySelector('.summarize-button');
      if (aiService && storageManager) {
        summarizeButton.addEventListener('click', () => summarizeLink(link, summarizeButton));
        summarizeButton.title = `Summarize "${link.title || link.text}" with AI`;
      } else {
        summarizeButton.style.display = 'none';
      }

      // Set up open button
      const openButton = clone.querySelector('.open-button');
      openButton.addEventListener('click', () => openLink(link.href));

      fragment.appendChild(clone);
      
      // Yield to main thread every 10 items to prevent blocking
      if (index % 10 === 0) {
        elements.blogLinks.appendChild(fragment);
        // Create new fragment instead of clearing innerHTML
        while (fragment.firstChild) {
          fragment.removeChild(fragment.firstChild);
        }
      }
    });

    // Append remaining items
    if (fragment.children.length > 0) {
      elements.blogLinks.appendChild(fragment);
    }

    // Show performance limit notice if applicable
    if (filteredLinks.length > CONFIG.MAX_VISIBLE_LINKS) {
      const notice = document.createElement('div');
      notice.className = 'performance-notice';
      notice.textContent = `Showing ${CONFIG.MAX_VISIBLE_LINKS} of ${filteredLinks.length} links. Use search to find specific links.`;
      notice.style.cssText = `
        padding: 8px 12px;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
        margin-top: 8px;
        font-size: 12px;
        color: #856404;
      `;
      elements.blogLinks.appendChild(notice);
    }
    
    performanceMetrics.renderTime = performance.now() - renderStart;
    console.log('Blog Link Analyzer: Render performance', {
      linkCount: linksToRender.length,
      totalLinks: filteredLinks.length,
      renderTime: Math.round(performanceMetrics.renderTime) + 'ms',
      depth: currentDepth
    });
  }

  // AI Feature Functions
  
  // AI Status Banner Management
  class AIStatusBanner {
    constructor() {
      this.banner = elements.aiStatusBanner;
      this.icon = elements.bannerIcon;
      this.message = elements.bannerMessage;
      this.action = elements.bannerAction;
      this.close = elements.bannerClose;
      this.currentState = 'hidden';
      this.dismissedStates = new Set(); // Track which states user has dismissed
      
      this.setupEventListeners();
    }
    
    setupEventListeners() {
      if (this.action) {
        this.action.addEventListener('click', () => {
          showAISettingsModal();
        });
      }
      
      if (this.close) {
        this.close.addEventListener('click', () => {
          this.dismiss();
        });
      }
    }
    
    show(state, message, options = {}) {
      if (!this.banner) return;
      
      // Don't show if user has dismissed this state and it's not critical
      if (this.dismissedStates.has(state) && !options.critical) {
        return;
      }
      
      this.currentState = state;
      this.banner.className = `ai-status-banner ${state}`;
      
      // Set icon based on state
      const icons = {
        error: '❌',
        warning: '⚠️',
        success: '✅',
        info: 'ℹ️'
      };
      
      if (this.icon) this.icon.textContent = icons[state] || '⚠️';
      if (this.message) this.message.textContent = message;
      
      // Set action button text
      if (this.action) {
        this.action.textContent = options.actionText || 'Configure';
        this.action.style.display = options.showAction !== false ? 'inline-block' : 'none';
      }
      
      this.banner.style.display = 'flex';
    }
    
    hide() {
      if (!this.banner) return;
      this.banner.style.display = 'none';
      this.currentState = 'hidden';
    }
    
    dismiss() {
      this.dismissedStates.add(this.currentState);
      this.hide();
    }
    
    clearDismissed() {
      this.dismissedStates.clear();
    }
  }
  
  let aiStatusBanner = null;
  
  // Check AI configuration and show appropriate banner
  async function checkAIConfiguration() {
    if (!aiService || !storageManager) {
      return { state: 'error', message: 'AI services not available', critical: true };
    }
    
    try {
      const settings = await storageManager.getAISettings();
      const providerConfig = aiService.getProviderConfig(settings.provider);
      
      // Check if API key is required but missing
      if (providerConfig.requiresApiKey) {
        const apiKey = await storageManager.getApiKey(settings.provider);
        if (!apiKey) {
          return { 
            state: 'warning', 
            message: `API key required for ${providerConfig.name}`,
            actionText: 'Add API Key',
            critical: false
          };
        }
      }
      
      // Check if custom model is enabled but empty
      if (settings.useCustomModel && !settings.customModel) {
        return { 
          state: 'warning', 
          message: 'Custom model name is empty',
          actionText: 'Set Model Name',
          critical: false
        };
      }
      
      // Test connection if everything looks configured
      const apiKey = await storageManager.getApiKey(settings.provider);
      const testResult = await aiService.testConnection(
        settings.provider,
        apiKey,
        settings.endpoint,
        settings.useCustomModel ? settings.customModel : settings.model
      );
      
      if (!testResult.success) {
        return { 
          state: 'error', 
          message: `AI connection failed: ${testResult.error}`,
          actionText: 'Fix Settings',
          critical: true
        };
      }
      
      return { state: 'success', message: 'AI features ready' };
      
    } catch (error) {
      console.error('Blog Link Analyzer: AI configuration check failed:', error);
      return { 
        state: 'error', 
        message: 'AI configuration error',
        actionText: 'Check Settings',
        critical: true
      };
    }
  }
  
  // Initialize AI status banner
  async function initializeAIStatusBanner() {
    aiStatusBanner = new AIStatusBanner();
    
    const config = await checkAIConfiguration();
    
    if (config.state === 'success') {
      // Don't show success banner, just hide any existing ones
      aiStatusBanner.hide();
    } else {
      aiStatusBanner.show(config.state, config.message, {
        actionText: config.actionText,
        critical: config.critical
      });
    }
  }
  
  // Show current page summary button
  function showCurrentPageSummaryButton() {
    const currentSummaryButton = document.getElementById('summarize-current-page');
    if (currentSummaryButton && blogData?.isBlog) {
      currentSummaryButton.style.display = 'flex';
    }
  }

  // Summarize a specific blog link
  async function summarizeLink(link, button) {
    if (!aiService || !storageManager) {
      showToast('AI services not available', 'error');
      return;
    }

    try {
      // Disable button and show loading
      button.disabled = true;
      button.textContent = '';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'summarize-icon';
      iconSpan.textContent = '⏳';
      button.appendChild(iconSpan);
      
      // Check for cached summary first
      if (aiSettings.cacheSummaries) {
        const cachedSummary = await storageManager.getCachedSummary(link.href);
        if (cachedSummary) {
          showSummaryModal(link, cachedSummary.summary, cachedSummary);
          return;
        }
      }

      // Show loading modal
      showSummaryModalLoading(link);

      // Fetch content
      const content = await contentFetcher.fetchContent(link.href);
      if (!content.success) {
        throw new Error(content.error);
      }

      // Validate extracted content
      if (!content.text || content.text.trim().length === 0) {
        throw new Error('No readable content found on page. The page might be empty, blocked, or use dynamic loading.');
      }

      // Different thresholds for external vs current page content
      const isExternalContent = link && link.href && link.href !== window.location.href;
      const minLength = isExternalContent ? 25 : 50; // More lenient for external content

      if (content.text.trim().length < minLength) {
        const context = isExternalContent 
          ? 'external link content' 
          : 'current page content';
        throw new Error(`Content too short to summarize (less than ${minLength} characters). The ${context} might be a placeholder, loading error, or have very minimal content.`);
      }

      console.log('Blog Link Analyzer: Content extracted successfully:', {
        url: link.href,
        contentLength: content.text.length,
        wordCount: content.wordCount,
        title: content.title,
        preview: content.text.substring(0, 100) + '...'
      });

      // Get API key for current provider
      const apiKey = await storageManager.getApiKey(aiSettings.provider);
      
      // Generate summary
      const summary = await aiService.summarize({
        content: content.text,
        provider: aiSettings.provider,
        model: aiSettings.model,
        apiKey: apiKey,
        endpoint: aiSettings.endpoint,
        maxTokens: aiSettings.maxTokens
      });

      // Cache summary
      if (aiSettings.cacheSummaries) {
        await storageManager.cacheSummary(link.href, {
          summary: summary,
          title: content.title,
          author: content.author,
          wordCount: content.wordCount
        });
      }

      // Show summary
      showSummaryModal(link, summary, content);

    } catch (error) {
      console.error('Blog Link Analyzer: Summary generation failed:', error);
      
      // Enhanced error handling with specific guidance
      let userMessage = error.message;
      let troubleshooting = '';
      
      if (error.message.includes('Content is required')) {
        userMessage = 'No content could be extracted from the page';
        troubleshooting = 'The page might be blocked, use dynamic loading, or be a paywall.';
      } else if (error.message.includes('No readable content found')) {
        userMessage = 'Unable to read page content';
        troubleshooting = 'Try refreshing the page or check if it\'s accessible.';
      } else if (error.message.includes('Content too short')) {
        userMessage = 'Page content is too short to summarize';
        troubleshooting = 'The page might be a placeholder, loading, or very brief.';
      } else if (error.message.includes('API key is required')) {
        userMessage = 'AI provider requires API key configuration';
        troubleshooting = 'Click the AI status banner to configure your API key.';
      } else if (error.message.includes('API key is invalid')) {
        userMessage = 'API key appears to be invalid';
        troubleshooting = 'Check your API key in AI settings and try again.';
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        userMessage = 'API quota exceeded or rate limited';
        troubleshooting = 'Wait a few minutes or check your API plan limits.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        userMessage = 'Network connection failed';
        troubleshooting = 'Check your internet connection and try again.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out';
        troubleshooting = 'The page or AI service is responding slowly. Try again.';
      }
      
      showSummaryModalError(link, userMessage);
      
      // Show enhanced toast with troubleshooting
      const fullMessage = troubleshooting ? 
        `${userMessage}\n💡 ${troubleshooting}` : 
        userMessage;
      
      showToast(fullMessage, 'error', 8000); // Longer display for complex errors
    } finally {
      // Restore button
      button.disabled = false;
      button.textContent = '';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'summarize-icon';
      iconSpan.textContent = '🤖';
      button.appendChild(iconSpan);
    }
  }

  // Summarize current page
  async function summarizeCurrentPage() {
    if (!aiService || !storageManager) {
      showToast('AI services not available', 'error');
      return;
    }

    try {
      const button = document.getElementById('summarize-current-page');
      if (button) {
        button.disabled = true;
        button.textContent = '';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        iconSpan.textContent = '⏳';
        const textSpan = document.createElement('span');
        textSpan.textContent = 'Generating...';
        button.appendChild(iconSpan);
        button.appendChild(textSpan);
      }

      // Get current tab content
      const content = await contentFetcher.getCurrentTabContent();
      if (!content.success) {
        throw new Error(content.error);
      }

      // Validate extracted content
      if (!content.text || content.text.trim().length === 0) {
        throw new Error('No readable content found on the current page. The page might be empty, blocked, or still loading.');
      }

      if (content.text.trim().length < 50) { // Standard threshold for current page
        throw new Error('Content too short to summarize (less than 50 characters). The current page might be a placeholder, loading error, or have very minimal content.');
      }

      console.log('Blog Link Analyzer: Current page content extracted successfully:', {
        url: content.url,
        contentLength: content.text.length,
        wordCount: content.wordCount,
        title: content.title,
        preview: content.text.substring(0, 100) + '...'
      });

      // Check for cached summary first
      if (aiSettings.cacheSummaries) {
        const cachedSummary = await storageManager.getCachedSummary(content.url);
        if (cachedSummary) {
          showSummaryModal({ href: content.url, title: content.title }, cachedSummary.summary, cachedSummary);
          return;
        }
      }

      // Get API key
      const apiKey = await storageManager.getApiKey(aiSettings.provider);
      
      // Generate summary
      const summary = await aiService.summarize({
        content: content.text,
        provider: aiSettings.provider,
        model: aiSettings.model,
        apiKey: apiKey,
        endpoint: aiSettings.endpoint,
        maxTokens: aiSettings.maxTokens
      });

      // Cache the summary
      if (aiSettings.cacheSummaries) {
        await storageManager.cacheSummary(content.url, {
          summary: summary,
          title: content.title,
          author: content.author,
          wordCount: content.wordCount
        });
      }

      // Show summary
      showSummaryModal({ href: content.url, title: content.title }, summary, content);

    } catch (error) {
      console.error('Blog Link Analyzer: Current page summary failed:', error);
      
      // Enhanced error handling with specific guidance
      let userMessage = error.message;
      let troubleshooting = '';
      
      if (error.message.includes('Content is required')) {
        userMessage = 'No content could be extracted from the current page';
        troubleshooting = 'The page might be blocked, use dynamic loading, or be a paywall.';
      } else if (error.message.includes('No readable content found')) {
        userMessage = 'Unable to read current page content';
        troubleshooting = 'Try refreshing the page or navigate to a different article.';
      } else if (error.message.includes('Content too short')) {
        userMessage = 'Current page content is too short to summarize';
        troubleshooting = 'The page might be a placeholder or very brief content.';
      } else if (error.message.includes('All content extraction methods failed')) {
        userMessage = 'Cannot extract content from this page';
        troubleshooting = 'This page type may not be supported. Try a different article.';
      } else if (error.message.includes('API key is required')) {
        userMessage = 'AI provider requires API key configuration';
        troubleshooting = 'Click the AI status banner to configure your API key.';
      } else if (error.message.includes('API key is invalid')) {
        userMessage = 'API key appears to be invalid';
        troubleshooting = 'Check your API key in AI settings and try again.';
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        userMessage = 'API quota exceeded or rate limited';
        troubleshooting = 'Wait a few minutes or check your API plan limits.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        userMessage = 'Network connection failed';
        troubleshooting = 'Check your internet connection and try again.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out';
        troubleshooting = 'The page or AI service is responding slowly. Try again.';
      }
      
      showSummaryModalError({ href: content.url, title: content.title }, userMessage);
      
      // Show enhanced toast with troubleshooting
      const fullMessage = troubleshooting ? 
        `${userMessage}\n💡 ${troubleshooting}` : 
        userMessage;
      
      showToast(fullMessage, 'error', 8000); // Longer display for complex errors
    } finally {
      const button = document.getElementById('summarize-current-page');
      if (button) {
        button.disabled = false;
        button.textContent = '';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        iconSpan.textContent = '🤖';
        const textSpan = document.createElement('span');
        textSpan.textContent = 'Summarize Current Page';
        button.appendChild(iconSpan);
        button.appendChild(textSpan);
      }
    }
  }

  // Show summary modal
  function showSummaryModal(link, summary, metadata) {
    const modal = document.getElementById('summary-modal');
    const titleElement = document.getElementById('summary-title');
    const metaElement = document.getElementById('summary-meta');
    const textElement = document.getElementById('summary-text');

    // Store context for regenerate functionality
    currentSummaryContext = {
      link: link,
      content: metadata,
      metadata: metadata,
      isCurrentPage: !link.href || link.href === window.location.href
    };

    if (titleElement) titleElement.textContent = link.title || 'Untitled';
    if (metaElement) {
      const metaInfo = [];
      if (metadata.author) metaInfo.push(`By ${metadata.author}`);
      if (metadata.wordCount) metaInfo.push(`${metadata.wordCount} words`);
      if (link.href) metaInfo.push(new URL(link.href).hostname);
      metaElement.textContent = metaInfo.join(' • ');
    }
    if (textElement) textElement.textContent = summary;

    if (modal) modal.style.display = 'flex';
  }
  
  // Show summary loading state in modal
  function showSummaryModalLoading(link) {
    const modal = document.getElementById('summary-modal');
    const titleElement = document.getElementById('summary-title');
    const metaElement = document.getElementById('summary-meta');
    const textElement = document.getElementById('summary-text');

    // Store context for regenerate functionality
    currentSummaryContext = {
      link: link,
      content: null,
      metadata: null,
      isCurrentPage: !link.href || link.href === window.location.href
    };

    if (titleElement) titleElement.textContent = link.title || 'Untitled';
    if (metaElement) metaElement.textContent = 'Generating summary...';
    if (textElement) {
      textElement.textContent = '';
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'summary-loading';
      
      const spinnerDiv = document.createElement('div');
      spinnerDiv.className = 'loading-spinner';
      
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Generating summary...';
      
      loadingDiv.appendChild(spinnerDiv);
      loadingDiv.appendChild(paragraph);
      textElement.appendChild(loadingDiv);
    }

    if (modal) modal.style.display = 'flex';
  }
  
  // Show summary error in modal
  function showSummaryModalError(link, error) {
    const modal = document.getElementById('summary-modal');
    const titleElement = document.getElementById('summary-title');
    const metaElement = document.getElementById('summary-meta');
    const textElement = document.getElementById('summary-text');

    if (titleElement) titleElement.textContent = link.title || 'Untitled';
    if (metaElement) metaElement.textContent = 'Error generating summary';
    if (textElement) {
      textElement.textContent = '';
      const errorDiv = document.createElement('div');
      errorDiv.className = 'summary-error';
      
      const iconDiv = document.createElement('div');
      iconDiv.className = 'error-icon';
      iconDiv.textContent = '⚠️';
      
      const titleParagraph = document.createElement('p');
      const titleStrong = document.createElement('strong');
      titleStrong.textContent = 'Failed to generate summary';
      titleParagraph.appendChild(titleStrong);
      
      const errorParagraph = document.createElement('p');
      errorParagraph.textContent = error;
      
      const closeButton = document.createElement('button');
      closeButton.className = 'button button-secondary';
      closeButton.textContent = 'Close';
      closeButton.addEventListener('click', hideSummaryModal);
      
      errorDiv.appendChild(iconDiv);
      errorDiv.appendChild(titleParagraph);
      errorDiv.appendChild(errorParagraph);
      errorDiv.appendChild(closeButton);
      textElement.appendChild(errorDiv);
    }

    if (modal) modal.style.display = 'flex';
  }

  // Hide summary modal
  function hideSummaryModal() {
    const modal = document.getElementById('summary-modal');
    if (modal) modal.style.display = 'none';
    // Clear context when modal is closed
    currentSummaryContext = {
      link: null,
      content: null,
      metadata: null,
      isCurrentPage: false
    };
  }

  // Clear cache for specific URL
  async function clearCacheForUrl(url) {
    if (!storageManager || !url) return;
    
    try {
      const summaries = await storageManager.get(storageManager.storageKeys.SUMMARIES) || {};
      if (summaries[url]) {
        delete summaries[url];
        await storageManager.set(storageManager.storageKeys.SUMMARIES, summaries);
        console.log(`Blog Link Analyzer: Cleared cache for ${url}`);
      }
    } catch (error) {
      console.warn(`Blog Link Analyzer: Failed to clear cache for ${url}:`, error);
    }
  }

  // Regenerate current summary
  async function regenerateCurrentSummary() {
    if (!aiService || !storageManager || !contentFetcher) {
      showToast('AI services not available', 'error');
      return;
    }

    if (!currentSummaryContext.link) {
      showToast('No summary context available for regeneration', 'error');
      return;
    }

    try {
      // Disable regenerate button and show loading state
      const regenerateButton = document.getElementById('regenerate-summary');
      if (regenerateButton) {
        regenerateButton.disabled = true;
        regenerateButton.textContent = '🔄 Regenerating...';
      }

      // Show loading state in modal
      const textElement = document.getElementById('summary-text');
      const metaElement = document.getElementById('summary-meta');
      
      if (metaElement) metaElement.textContent = 'Regenerating summary...';
      if (textElement) {
        textElement.innerHTML = `
          <div class="summary-loading">
            <div class="loading-spinner"></div>
            <p>Regenerating summary...</p>
          </div>
        `;
      }

      const url = currentSummaryContext.link.href || currentSummaryContext.content?.url;
      if (!url) {
        throw new Error('No URL available for regeneration');
      }

      // Clear cache to force fresh generation
      await clearCacheForUrl(url);

      let content;
      
      // Use existing content if available, otherwise fetch fresh content
      if (currentSummaryContext.content && currentSummaryContext.content.text) {
        console.log('Blog Link Analyzer: Using existing content for regeneration');
        content = currentSummaryContext.content;
      } else {
        console.log('Blog Link Analyzer: Fetching fresh content for regeneration');
        
        if (currentSummaryContext.isCurrentPage) {
          content = await contentFetcher.getCurrentTabContent();
        } else {
          content = await contentFetcher.fetchContent(url);
        }
        
        if (!content.success) {
          throw new Error(content.error);
        }
      }

      // Validate content
      if (!content.text || content.text.trim().length === 0) {
        throw new Error('No readable content found for regeneration.');
      }

      // Check content length
      const minLength = currentSummaryContext.isCurrentPage ? 50 : 25;
      if (content.text.trim().length < minLength) {
        throw new Error(`Content too short to summarize (less than ${minLength} characters).`);
      }

      console.log('Blog Link Analyzer: Content validated for regeneration:', {
        url: url,
        contentLength: content.text.length,
        wordCount: content.wordCount,
        isCurrentPage: currentSummaryContext.isCurrentPage
      });

      // Get API key
      const apiKey = await storageManager.getApiKey(aiSettings.provider);
      
      // Generate new summary
      const summary = await aiService.summarize({
        content: content.text,
        provider: aiSettings.provider,
        model: aiSettings.model,
        apiKey: apiKey,
        endpoint: aiSettings.endpoint,
        maxTokens: aiSettings.maxTokens
      });

      // Update context with new content
      currentSummaryContext.content = content;
      currentSummaryContext.metadata = content;

      // Cache the new summary
      if (aiSettings.cacheSummaries) {
        await storageManager.cacheSummary(url, {
          summary: summary,
          title: content.title,
          author: content.author,
          wordCount: content.wordCount
        });
      }

      // Update modal with new summary
      const titleElement = document.getElementById('summary-title');
      const metaElementFinal = document.getElementById('summary-meta');
      const textElementFinal = document.getElementById('summary-text');

      if (titleElement) titleElement.textContent = currentSummaryContext.link.title || content.title || 'Untitled';
      if (metaElementFinal) {
        const metaInfo = [];
        if (content.author) metaInfo.push(`By ${content.author}`);
        if (content.wordCount) metaInfo.push(`${content.wordCount} words`);
        if (url) metaInfo.push(new URL(url).hostname);
        metaInfo.push('🔄 Regenerated');
        metaElementFinal.textContent = metaInfo.join(' • ');
      }
      if (textElementFinal) textElementFinal.textContent = summary;

      showToast('Summary regenerated successfully', 'success');

    } catch (error) {
      console.error('Blog Link Analyzer: Summary regeneration failed:', error);
      
      // Enhanced error handling
      let userMessage = error.message;
      let troubleshooting = '';
      
      if (error.message.includes('No readable content found')) {
        userMessage = 'Unable to read content for regeneration';
        troubleshooting = 'The page content may have changed or become inaccessible.';
      } else if (error.message.includes('Content too short')) {
        userMessage = 'Content too short to summarize';
        troubleshooting = 'The page may have changed or contains minimal content.';
      } else if (error.message.includes('API key is required')) {
        userMessage = 'AI provider requires API key configuration';
        troubleshooting = 'Click AI status banner to configure your API key.';
      } else if (error.message.includes('API key is invalid')) {
        userMessage = 'API key appears to be invalid';
        troubleshooting = 'Check your API key in AI settings and try again.';
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        userMessage = 'API quota exceeded or rate limited';
        troubleshooting = 'Wait a few minutes or check your API plan limits.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        userMessage = 'Network connection failed';
        troubleshooting = 'Check your internet connection and try again.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out';
        troubleshooting = 'The AI service is responding slowly. Try again.';
      }
      
      // Show error in modal
      const textElement = document.getElementById('summary-text');
      const metaElement = document.getElementById('summary-meta');
      
      if (metaElement) metaElement.textContent = 'Regeneration failed';
      if (textElement) {
        textElement.innerHTML = `
          <div class="summary-error">
            <div class="error-icon">⚠️</div>
            <p><strong>Failed to regenerate summary</strong></p>
            <p>${userMessage}</p>
            ${troubleshooting ? `<p><em>💡 ${troubleshooting}</em></p>` : ''}
            <button class="button button-secondary" onclick="regenerateCurrentSummary()">Try Again</button>
            <button class="button button-secondary" onclick="hideSummaryModal()">Close</button>
          </div>
        `;
      }
      
      // Show enhanced toast
      const fullMessage = troubleshooting ? 
        `${userMessage}\n💡 ${troubleshooting}` : 
        userMessage;
      
      showToast(fullMessage, 'error', 8000);
      
    } finally {
      // Restore regenerate button
      const regenerateButton = document.getElementById('regenerate-summary');
      if (regenerateButton) {
        regenerateButton.disabled = false;
        regenerateButton.textContent = '🔄 Regenerate';
      }
    }
  }

  // Show AI settings modal
  function showAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (modal) modal.style.display = 'flex';
    
    // Load current settings into form
    loadAISettingsIntoForm();
  }

  // Hide AI settings modal
  function hideAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (modal) modal.style.display = 'none';
  }

  // Load AI settings into form
  async function loadAISettingsIntoForm() {
    if (!aiSettings) return;

    try {
      // Set provider
      const providerSelect = document.getElementById('ai-provider');
      if (providerSelect) {
        providerSelect.value = aiSettings.provider;
        await updateModelOptions(aiSettings.provider);
      }

      // Set model
      const modelSelect = document.getElementById('ai-model');
      const customModelInput = document.getElementById('custom-model');
      const useCustomModelCheckbox = document.getElementById('use-custom-model');
      const customModelGroup = document.getElementById('custom-model-group');
      
      if (modelSelect) modelSelect.value = aiSettings.model;
      
      // Set custom model settings
      if (aiSettings.useCustomModel && aiSettings.customModel) {
        customModelInput.value = aiSettings.customModel;
        useCustomModelCheckbox.checked = true;
        customModelGroup.style.display = 'block';
      }

      // Set API key (masked)
      const apiKeyInput = document.getElementById('api-key');
      if (apiKeyInput && aiSettings.provider !== 'ollama') {
        const existingKey = await storageManager.getApiKey(aiSettings.provider);
        apiKeyInput.value = existingKey ? '••••••••••••••••' : '';
      }

      // Set custom endpoint
      const endpointInput = document.getElementById('custom-endpoint');
      if (endpointInput) {
        let endpointValue = aiSettings.endpoint || '';
        // For Ollama, show default endpoint if none is saved
        if (!endpointValue && aiSettings.provider === 'ollama') {
          const providerConfig = aiService?.getProviderConfig('ollama');
          endpointValue = providerConfig?.defaultEndpoint || '';
        }
        endpointInput.value = endpointValue;
      }

      // Set sliders
      const maxTokensSlider = document.getElementById('max-tokens');
      const temperatureSlider = document.getElementById('temperature');
      if (temperatureSlider) {
        temperatureSlider.addEventListener('input', (e) => {
          e.target.nextElementSibling.textContent = e.target.value;
        });
      }
      
      // Depth limit slider
      const maxDepthSlider = document.getElementById('max-depth');
      if (maxDepthSlider) {
        maxDepthSlider.addEventListener('input', (e) => {
          e.target.nextElementSibling.textContent = `${e.target.value} levels`;
        });
      }
      
      // No depth limit checkbox
      const noDepthLimitCheckbox = document.getElementById('no-depth-limit');
      if (noDepthLimitCheckbox) {
        noDepthLimitCheckbox.addEventListener('change', (e) => {
          maxDepthSlider.disabled = e.target.checked;
        });
      }
      if (temperatureSlider) {
        temperatureSlider.value = aiSettings.temperature;
        temperatureSlider.nextElementSibling.textContent = aiSettings.temperature;
      }

      // Set checkboxes
      const cacheCheckbox = document.getElementById('cache-summaries');
      const autoCheckbox = document.getElementById('auto-summarize');
      
      if (cacheCheckbox) cacheCheckbox.checked = aiSettings.cacheSummaries;
      if (autoCheckbox) autoCheckbox.checked = aiSettings.autoSummarize;
      
      // Set depth limit settings
      if (maxDepthSlider) {
        maxDepthSlider.value = aiSettings.maxDepth || 25;
        maxDepthSlider.nextElementSibling.textContent = `${aiSettings.maxDepth || 25} levels`;
      }
      if (noDepthLimitCheckbox) {
        noDepthLimitCheckbox.checked = aiSettings.noDepthLimit || false;
        // Disable slider if no limit is set
        maxDepthSlider.disabled = aiSettings.noDepthLimit || false;
      }

      // Show/hide relevant fields
      toggleProviderFields(aiSettings.provider);

    } catch (error) {
      console.error('Blog Link Analyzer: Failed to load AI settings into form:', error);
    }
  }

  // Update model options based on provider
  async function updateModelOptions(provider) {
    const modelSelect = document.getElementById('ai-model');
    if (!modelSelect || !aiService) return;

    try {
      // Use appropriate endpoint for the provider
      let endpoint = aiSettings.endpoint;
      if (!endpoint && provider === 'ollama') {
        // Use Ollama's default endpoint if none is configured
        const providerConfig = aiService.getProviderConfig(provider);
        endpoint = providerConfig.defaultEndpoint;
      }
      
      const models = await aiService.getModels(provider, endpoint);
      while (modelSelect.firstChild) {
        modelSelect.removeChild(modelSelect.firstChild);
      }
      
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });

      // Set default model if available
      const providerConfig = aiService.getProviderConfig(provider);
      if (providerConfig && models.includes(providerConfig.defaultModel)) {
        modelSelect.value = providerConfig.defaultModel;
      }

    } catch (error) {
      console.error('Blog Link Analyzer: Failed to update model options:', error);
      while (modelSelect.firstChild) {
        modelSelect.removeChild(modelSelect.firstChild);
      }
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Failed to load models';
      modelSelect.appendChild(option);
    }
  }

  // Toggle provider-specific fields
  function toggleProviderFields(provider) {
    const apiKeyGroup = document.getElementById('api-key-group');
    const customEndpointGroup = document.getElementById('custom-endpoint-group');
    
    const providerConfig = aiService?.getProviderConfig(provider);
    const requiresApiKey = providerConfig?.requiresApiKey;
    const isCustom = provider === 'custom';
    const isOllama = provider === 'ollama';

    if (apiKeyGroup) {
      apiKeyGroup.style.display = requiresApiKey ? 'block' : 'none';
    }
    if (customEndpointGroup) {
      customEndpointGroup.style.display = (isCustom || isOllama) ? 'block' : 'none';
    }
  }

  // Toggle custom model option based on provider
  function toggleCustomModelOption(provider) {
    const useCustomModelCheckbox = document.getElementById('use-custom-model');
    const customModelGroup = document.getElementById('custom-model-group');
    
    // Allow custom models for all providers, but make it more prominent for Ollama
    if (provider === 'ollama') {
      useCustomModelCheckbox.parentElement.style.display = 'block';
      if (useCustomModelCheckbox.checked) {
        customModelGroup.style.display = 'block';
      }
    } else {
      useCustomModelCheckbox.parentElement.style.display = 'block';
      if (useCustomModelCheckbox.checked) {
        customModelGroup.style.display = 'block';
      }
    }
  }

  // Save AI settings
  async function saveAISettings() {
    if (!storageManager) return;

    try {
      const provider = document.getElementById('ai-provider').value;
      const model = document.getElementById('ai-model').value;
      const apiKeyInput = document.getElementById('api-key');
      const customEndpoint = document.getElementById('custom-endpoint').value;
      const maxTokens = parseInt(document.getElementById('max-tokens').value);
      const temperature = parseFloat(document.getElementById('temperature').value);
      const cacheSummaries = document.getElementById('cache-summaries').checked;
      const autoSummarize = document.getElementById('auto-summarize').checked;
      const maxDepth = parseInt(document.getElementById('max-depth').value);
      const noDepthLimit = document.getElementById('no-depth-limit').checked;
      const useCustomModel = document.getElementById('use-custom-model').checked;
      const customModel = document.getElementById('custom-model').value.trim();

      // Determine which model to use
      const finalModel = useCustomModel && customModel ? customModel : model;
      
      // Get provider config for validation
      const providerConfig = aiService?.getProviderConfig(provider);
      
      // Handle API key saving with validation
      let apiKey = null;
      if (apiKeyInput.value && !apiKeyInput.value.includes('•')) {
        // New API key entered (not masked)
        apiKey = apiKeyInput.value.trim();
        
        if (providerConfig?.requiresApiKey && !apiKey) {
          throw new Error(`API key is required for ${providerConfig.name || provider}`);
        }
        
        if (apiKey) {
          // Basic validation - check minimum length
          if (apiKey.length < 8) {
            throw new Error('API key appears to be too short (minimum 8 characters)');
          }
          
          await storageManager.saveApiKey(provider, apiKey);
          console.log(`Blog Link Analyzer: API key saved for provider: ${provider}`);
        }
      } else if (providerConfig?.requiresApiKey && !apiKeyInput.value.includes('•')) {
        // Provider requires API key but field is empty
        throw new Error(`API key is required for ${providerConfig.name || provider}`);
      }
      
      // Save settings
      const newSettings = {
        provider,
        model: finalModel,
        endpoint: customEndpoint,
        maxTokens,
        temperature,
        cacheSummaries,
        autoSummarize,
        maxDepth,
        noDepthLimit,
        useCustomModel,
        customModel: useCustomModel ? customModel : null
      };

      await storageManager.saveAISettings(newSettings);
      aiSettings = newSettings;
      
      // Update CONFIG with new depth limit
      if (!noDepthLimit) {
        CONFIG.MAX_DEPTH = maxDepth;
      } else {
        CONFIG.MAX_DEPTH = Infinity; // No limit
      }

      showToast('AI settings saved successfully', 'success');
      hideAISettingsModal();
      
      // Re-check AI configuration and update banner
      if (aiStatusBanner) {
        await initializeAIStatusBanner();
      }

    } catch (error) {
      console.error('Blog Link Analyzer: Failed to save AI settings:', error);
      showToast(`Failed to save settings: ${error.message}`, 'error');
    }
  }



  // Test AI connection
  async function testAIConnection() {
    if (!aiService || !storageManager) return;

    try {
      const provider = document.getElementById('ai-provider').value;
      const model = document.getElementById('ai-model').value;
      const apiKeyInput = document.getElementById('api-key');
      const customEndpoint = document.getElementById('custom-endpoint').value;
      const useCustomModel = document.getElementById('use-custom-model').checked;
      const customModel = document.getElementById('custom-model').value.trim();

      let apiKey = null;
      if (apiKeyInput.value && !apiKeyInput.value.includes('•')) {
        apiKey = apiKeyInput.value;
      } else {
        apiKey = await storageManager.getApiKey(provider);
      }

      // Validate inputs before testing
      if (!provider) {
        showToast('Please select an AI provider', 'error');
        return;
      }

      const providerConfig = aiService.getProviderConfig(provider);
      if (providerConfig.requiresApiKey && !apiKey) {
        showToast('API key is required for this provider', 'error');
        return;
      }

      if (useCustomModel && !customModel) {
        showToast('Please enter a custom model name', 'error');
        return;
      }

      const finalModel = useCustomModel && customModel ? customModel : model;
      if (!finalModel) {
        showToast('Please select or enter a model name', 'error');
        return;
      }

      const testButton = document.getElementById('test-connection');
      if (testButton) {
        testButton.disabled = true;
        testButton.textContent = 'Testing...';
      }

      // Use appropriate endpoint for the provider
      let testEndpoint = customEndpoint;
      if (!testEndpoint && provider === 'ollama') {
        // Use Ollama's default endpoint if none is configured
        const providerConfig = aiService.getProviderConfig(provider);
        testEndpoint = providerConfig.defaultEndpoint;
      }
      
      const result = await aiService.testConnection(provider, apiKey, testEndpoint, finalModel);

      if (result.success) {
        showToast('Connection test successful!', 'success');
        // Update banner after successful test
        if (aiStatusBanner) {
          await initializeAIStatusBanner();
        }
      } else {
        const errorMessage = result.error || 'Unknown error occurred';
        showToast(`Connection test failed: ${errorMessage}`, 'error');
        
        // Show more specific error in banner
        if (aiStatusBanner) {
          aiStatusBanner.show('error', `AI connection failed: ${errorMessage}`, {
            actionText: 'Fix Settings',
            critical: true
          });
        }
      }

    } catch (error) {
      console.error('Blog Link Analyzer: Connection test failed:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      showToast(`Connection test failed: ${errorMessage}`, 'error');
      
      if (aiStatusBanner) {
        aiStatusBanner.show('error', `AI connection error: ${errorMessage}`, {
          actionText: 'Fix Settings',
          critical: true
        });
      }
    } finally {
      const testButton = document.getElementById('test-connection');
      if (testButton) {
        testButton.disabled = false;
        testButton.textContent = 'Test Connection';
      }
    }
  }

  // Copy summary to clipboard
  async function copySummaryToClipboard() {
    const textElement = document.getElementById('summary-text');
    if (!textElement) return;

    try {
      await navigator.clipboard.writeText(textElement.textContent);
      showToast('Summary copied to clipboard', 'success');
    } catch (error) {
      console.error('Blog Link Analyzer: Failed to copy summary:', error);
      showToast('Failed to copy summary', 'error');
    }
  }

  // Toggle password visibility
  function togglePasswordVisibility() {
    const apiKeyInput = document.getElementById('api-key');
    const toggleButton = document.getElementById('toggle-api-key');
    
    if (apiKeyInput && toggleButton) {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleButton.textContent = '🙈';
      } else {
        apiKeyInput.type = 'password';
        toggleButton.textContent = '👁️';
      }
    }
  }

  // Toggle nested links for a blog post
  async function toggleNestedLinks(linkId, button) {
    const item = button.closest('.blog-link-item');
    const nestedContainer = item.querySelector('.nested-links');
    const isExpanded = expandedItems.has(linkId);

    if (isExpanded) {
      // Collapse
      nestedContainer.style.display = 'none';
      button.classList.remove('expanded');
      expandedItems.delete(linkId);
    } else {
      // Expand
      nestedContainer.style.display = 'block';
      button.classList.add('expanded');
      expandedItems.add(linkId);

      // Load nested links if not already loaded
      if (!nestedContainer.dataset.loaded) {
        await loadNestedLinks(linkId, nestedContainer);
        nestedContainer.dataset.loaded = 'true';
      }
    }
  }

  // Enhanced cache management
  function manageCacheSize() {
    if (nestedLinkCache.size >= CONFIG.MAX_CACHE_SIZE) {
      // Remove oldest entries (simple FIFO for now)
      const keysToDelete = Array.from(nestedLinkCache.keys()).slice(0, Math.floor(CONFIG.MAX_CACHE_SIZE * 0.2));
      keysToDelete.forEach(key => nestedLinkCache.delete(key));
      console.log(`Blog Link Analyzer: Cache cleanup - removed ${keysToDelete.length} entries`);
    }
  }

  // Load nested links for a blog post with enhanced queuing
  async function loadNestedLinks(linkId, container) {
    try {
      const link = filteredLinks.find(l => l.id === linkId);
      if (!link) return;

      // Check cache first
      const cacheKey = `${link.href}_${currentDepth}`;
      if (nestedLinkCache.has(cacheKey)) {
        console.log(`Blog Link Analyzer: Using cached data for ${cacheKey}`);
        const cachedData = nestedLinkCache.get(cacheKey);
        renderNestedLinks(cachedData.nestedLinks, container, link);
        return;
      }

      // Show loading
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'nested-loading';
      loadingDiv.textContent = 'Loading nested links...';
      container.appendChild(loadingDiv);

      // Use queued request system
      const response = await queueNestedLinkRequest(linkId, link.href);

      if (response && response.nestedLinks) {
        console.log(`Blog Link Analyzer: Received ${response.nestedLinks.length} nested links for ${link.href}`);
        
        // Add depth information to nested links
        const nestedLinksWithDepth = response.nestedLinks.map(nestedLink => ({
          ...nestedLink,
          depth: currentDepth + 1,
          parentLink: link
        }));
        
        renderNestedLinks(nestedLinksWithDepth, container, link);
      } else {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        const noLinksDiv = document.createElement('div');
        noLinksDiv.className = 'nested-loading';
        noLinksDiv.textContent = 'No nested links found.';
        container.appendChild(noLinksDiv);
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Error loading nested links:', error);
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      const errorDiv = document.createElement('div');
      errorDiv.className = 'nested-loading';
      errorDiv.textContent = 'Error loading nested links.';
      container.appendChild(errorDiv);
    }
  }

  // Render nested links
  function renderNestedLinks(nestedLinks, container, parentLink = null) {
    if (nestedLinks.length === 0) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      const noLinksDiv = document.createElement('div');
      noLinksDiv.className = 'nested-loading';
      noLinksDiv.textContent = 'No nested links found.';
      container.appendChild(noLinksDiv);
      return;
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.className = `nested-links level-${currentDepth + 1}`;
    
    nestedLinks.forEach((nestedLink, index) => {
      const item = document.createElement('div');
      item.className = 'nested-link-item';
      
      // Main link
      const link = document.createElement('a');
      link.href = nestedLink.href;
      link.textContent = nestedLink.title || nestedLink.text || 'Unknown Title';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Actions container
      const actions = document.createElement('div');
      actions.className = 'nested-link-actions';
      
      // Add expand button for internal links within depth limit
      if (nestedLink.isInternal && currentDepth < CONFIG.MAX_DEPTH) {
        const expandButton = document.createElement('button');
        expandButton.className = 'nested-expand-button';
        expandButton.textContent = 'Explore';
        const depthText = currentDepth + 2 >= CONFIG.MAX_DEPTH ? ' (max depth)' : ` (level ${currentDepth + 2})`;
        expandButton.title = `Explore links from "${nestedLink.title || nestedLink.text}"${depthText}`;
        
        expandButton.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Check if this nested link has its own nested links
          const nestedCacheKey = `${nestedLink.href}_${currentDepth + 1}`;
          let hasNestedLinks = false;
          
          if (nestedLinkCache.has(nestedCacheKey)) {
            hasNestedLinks = nestedLinkCache.get(nestedCacheKey).nestedLinks.length > 0;
          } else {
            // Quick check if it might have nested links
            try {
              const response = await sendMessage({
                type: 'FETCH_NESTED_LINKS',
                url: nestedLink.href
              });
              hasNestedLinks = response.success && response.data && response.data.nestedLinks.length > 0;
              
              // Cache the result
              if (response.success) {
                nestedLinkCache.set(nestedCacheKey, response.data);
              }
            } catch (error) {
              console.error('Blog Link Analyzer: Error checking nested links:', error);
            }
          }
          
          if (hasNestedLinks) {
            // Navigate to this nested link's children
            const nestedCacheKey = `${nestedLink.href}_${currentDepth + 1}`;
            const cachedData = nestedLinkCache.get(nestedCacheKey);
            
            const nestedLinksWithDepth = cachedData.nestedLinks.map(deepNestedLink => ({
              ...deepNestedLink,
              depth: currentDepth + 2,
              parentLink: nestedLink
            }));
            
            navigateToNestedLinks(nestedLink, nestedLinksWithDepth);
          } else {
            showToast('No further nested links found 📭');
          }
        });
        
        actions.appendChild(expandButton);
      }
      
      item.appendChild(link);
      item.appendChild(actions);
      container.appendChild(item);
    });
  }

  // Open link in new tab with error handling
  function openLink(href) {
    try {
      const chromeAPI = getChromeAPI();
      chromeAPI.tabs.create({ url: href });
    } catch (error) {
      console.error('Blog Link Analyzer: Failed to open link:', error);
      // Fallback: try opening in current tab
      window.open(href, '_blank');
    }
  }

  // Show no results state
  function showNoResults(message) {
    console.log('Blog Link Analyzer: Showing no results:', message);
    
    // Try to hide sections, but don't fail if elements aren't ready
    try {
      hideAllSections();
    } catch (e) {
      console.warn('Blog Link Analyzer: Could not hide sections:', e);
    }
    
    // Try to show no results section
    if (elements.noResultsSection) {
      elements.noResultsSection.style.display = 'block';
      const noResultsMessage = document.getElementById('no-results-message');
      if (noResultsMessage) {
        noResultsMessage.textContent = message;
      }
    } else {
      // Fallback to error display
      showError(message);
    }
  }

  // Show error state with enhanced information
  function showError(message, errorInfo = null) {
    console.error('Blog Link Analyzer: Showing error:', message);
    
    // Try to hide sections, but don't fail if elements aren't ready
    try {
      hideAllSections();
    } catch (e) {
      console.warn('Blog Link Analyzer: Could not hide sections:', e);
    }
    
    // Try to show error section
    if (elements.errorSection) {
      elements.errorSection.style.display = 'block';
      
      const errorMessage = document.getElementById('error-message');
      if (errorMessage) {
        errorMessage.textContent = message;
      }
    } else {
      // Fallback: create error display manually
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
      
      const errorContainer = document.createElement('div');
      errorContainer.style.cssText = 'padding: 20px; text-align: center; color: #d32f2f;';
      
      const heading = document.createElement('h3');
      heading.textContent = 'Extension Error';
      
      const messageParagraph = document.createElement('p');
      messageParagraph.textContent = message;
      
      const reloadButton = document.createElement('button');
      reloadButton.textContent = 'Reload Extension';
      reloadButton.style.cssText = 'padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;';
      reloadButton.addEventListener('click', () => location.reload());
      
      errorContainer.appendChild(heading);
      errorContainer.appendChild(messageParagraph);
      errorContainer.appendChild(reloadButton);
      document.body.appendChild(errorContainer);
    }
    
    // Add debug information if available
    if (errorInfo) {
      const debugInfo = document.createElement('div');
      debugInfo.className = 'error-debug-info';
      const details = document.createElement('details');
      
      const summary = document.createElement('summary');
      summary.textContent = 'Debug Information';
      
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(errorInfo, null, 2);
      
      details.appendChild(summary);
      details.appendChild(pre);
      debugInfo.appendChild(details);
      errorMessage.appendChild(debugInfo);
    }
    
    // Add retry with different strategies
    addRetryStrategies(errorInfo);
  }

  // Add retry strategies based on error type
  function addRetryStrategies(errorInfo) {
    const errorSection = elements.errorSection;
    
    // Remove existing retry strategies
    const existingStrategies = errorSection.querySelector('.retry-strategies');
    if (existingStrategies) {
      existingStrategies.remove();
    }
    
    const strategies = document.createElement('div');
    strategies.className = 'retry-strategies';
    
    if (errorInfo && errorInfo.chromeAvailable === false) {
      const suggestionParagraph = document.createElement('p');
      suggestionParagraph.className = 'error-suggestion';
      suggestionParagraph.textContent = 'Chrome APIs not available. Try:';
      
      const list = document.createElement('ul');
      
      const suggestions = [
        'Restarting your browser',
        'Reinstalling the extension',
        'Checking if extensions are enabled'
      ];
      
      suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        li.textContent = suggestion;
        list.appendChild(li);
      });
      
      strategies.appendChild(suggestionParagraph);
      strategies.appendChild(list);
    } else if (errorInfo && errorInfo.type === 'InitializationError') {
      const suggestionParagraph = document.createElement('p');
      suggestionParagraph.className = 'error-suggestion';
      suggestionParagraph.textContent = 'Initialization failed. Try:';
      
      const list = document.createElement('ul');
      
      const suggestions = [
        'Refreshing the page',
        'Restarting the browser',
        'Checking browser console for details'
      ];
      
      suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        li.textContent = suggestion;
        list.appendChild(li);
      });
      
      strategies.appendChild(suggestionParagraph);
      strategies.appendChild(list);
    } else {
      const suggestionParagraph = document.createElement('p');
      suggestionParagraph.className = 'error-suggestion';
      suggestionParagraph.textContent = 'Something went wrong. Try:';
      
      const list = document.createElement('ul');
      
      const suggestions = [
        'Refreshing current page',
        'Checking if page is a blog post',
        'Trying again in a few moments'
      ];
      
      suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        li.textContent = suggestion;
        list.appendChild(li);
      });
      
      strategies.appendChild(suggestionParagraph);
      strategies.appendChild(list);
      
      errorSection.appendChild(strategies);
    }
  }

  // Hide all sections
  function hideAllSections() {
    if (elements.loadingSection) elements.loadingSection.style.display = 'none';
    if (elements.noResultsSection) elements.noResultsSection.style.display = 'none';
    if (elements.errorSection) elements.errorSection.style.display = 'none';
    if (elements.linksSection) elements.linksSection.style.display = 'none';
  }

  // Show toast notification
  function showToast(message, type = 'info', duration = 3000) {
    if (!elements.toast || !elements.toastMessage) return;
    
    // Set message and type styling
    elements.toastMessage.textContent = message;
    elements.toast.className = `toast show ${type}`;
    
    // Auto-hide after duration
    setTimeout(() => {
      if (elements.toast) {
        elements.toast.classList.remove('show');
      }
    }, duration);
  }

  // Navigation state management
  function navigateToNestedLinks(parentLink, nestedLinks) {
    // Add to navigation stack
    navigationStack.push({
      parentLink: currentParentLink,
      depth: currentDepth,
      filteredLinks: [...filteredLinks]
    });
    
    currentParentLink = parentLink;
    currentDepth = parentLink ? parentLink.depth + 1 : 0;
    filteredLinks = nestedLinks;
    
    // Update UI
    updateBreadcrumb();
    updateLinksLabel();
    renderBlogLinks();
  }

  function navigateBack() {
    if (navigationStack.length === 0) return;
    
    const previousState = navigationStack.pop();
    currentParentLink = previousState.parentLink;
    currentDepth = previousState.depth;
    filteredLinks = previousState.filteredLinks;
    
    // Update UI
    updateBreadcrumb();
    updateLinksLabel();
    renderBlogLinks();
  }

  function navigateToRoot() {
    navigationStack = [];
    currentParentLink = null;
    currentDepth = 0;
    filteredLinks = blogData ? blogData.blogLinks || [] : [];
    
    // Update UI
    updateBreadcrumb();
    updateLinksLabel();
    renderBlogLinks();
  }

  // Update breadcrumb display
  function updateBreadcrumb() {
    if (currentDepth === 0) {
      elements.breadcrumbSection.style.display = 'none';
      return;
    }
    
    elements.breadcrumbSection.style.display = 'block';
    
    // Build breadcrumb path
    const pathItems = [];
    
    // Add parent links from navigation stack
    navigationStack.forEach((state, index) => {
      if (state.parentLink) {
        pathItems.push({
          title: state.parentLink.title || state.parentLink.text,
          depth: state.depth,
          isCurrent: false
        });
      }
    });
    
    // Add current parent
    if (currentParentLink) {
      pathItems.push({
        title: currentParentLink.title || currentParentLink.text,
        depth: currentDepth,
        isCurrent: true
      });
    }
    
    // Render breadcrumb
    while (elements.breadcrumbPath.firstChild) {
      elements.breadcrumbPath.removeChild(elements.breadcrumbPath.firstChild);
    }
    
    pathItems.forEach((item, index) => {
      const itemElement = document.createElement('div');
      itemElement.className = `breadcrumb-item ${item.isCurrent ? 'breadcrumb-current' : ''}`;
      
      if (item.isCurrent) {
        itemElement.textContent = item.title;
      } else {
        // Make clickable for navigation
        const link = document.createElement('button');
        link.className = 'breadcrumb-link';
        link.textContent = item.title;
        link.style.background = 'none';
        link.style.border = 'none';
        link.style.color = '#667eea';
        link.style.cursor = 'pointer';
        link.style.fontSize = '12px';
        link.onclick = () => navigateToDepth(item.depth);
        itemElement.appendChild(link);
      }
      
      elements.breadcrumbPath.appendChild(itemElement);
      
      // Add separator except for last item
      if (index < pathItems.length - 1) {
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.textContent = '›';
        elements.breadcrumbPath.appendChild(separator);
      }
    });
  }

  // Navigate to specific depth
  function navigateToDepth(targetDepth) {
    while (navigationStack.length > 0 && navigationStack[navigationStack.length - 1].depth > targetDepth) {
      navigationStack.pop();
    }
    
    if (navigationStack.length > 0) {
      const targetState = navigationStack[navigationStack.length - 1];
      currentParentLink = targetState.parentLink;
      currentDepth = targetState.depth;
      filteredLinks = targetState.filteredLinks;
    } else {
      navigateToRoot();
      return;
    }
    
    updateBreadcrumb();
    updateLinksLabel();
    renderBlogLinks();
  }

  // Update links label based on current depth
  function updateLinksLabel() {
    if (currentDepth === 0) {
      elements.linksLabel.textContent = 'filtered posts';
    } else if (currentDepth === 1) {
      elements.linksLabel.textContent = 'nested posts';
    } else if (currentDepth === CONFIG.MAX_DEPTH) {
      elements.linksLabel.textContent = `max depth posts`;
    } else {
      elements.linksLabel.textContent = `level ${currentDepth} posts`;
    }
  }

  // Request queuing for nested links
  function queueNestedLinkRequest(linkId, url) {
    const requestKey = `${url}_${currentDepth}`;
    
    return new Promise((resolve, reject) => {
      // Check if already queued or active
      if (activeRequests.has(requestKey) || requestQueue.find(r => r.key === requestKey)) {
        console.log(`Blog Link Analyzer: Request already queued for ${requestKey}`);
        // Wait for existing request to complete
        const checkInterval = setInterval(() => {
          if (!activeRequests.has(requestKey) && !requestQueue.find(r => r.key === requestKey)) {
            clearInterval(checkInterval);
            // Try to get from cache
            if (nestedLinkCache.has(requestKey)) {
              resolve(nestedLinkCache.get(requestKey));
            } else {
              reject(new Error('Request failed and no cache available'));
            }
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Request wait timeout'));
        }, 10000);
        return;
      }
      
      // Add to queue
      requestQueue.push({
        key: requestKey,
        linkId: linkId,
        url: url,
        resolve: resolve,
        reject: reject
      });
      
      processQueue();
    });
  }

  // Process request queue
  async function processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    while (requestQueue.length > 0 && activeRequests.size < CONFIG.MAX_CONCURRENT_REQUESTS) {
      const request = requestQueue.shift();
      
      try {
        console.log(`Blog Link Analyzer: Processing queued request for ${request.url}`);
        
        // Check cache first
        if (nestedLinkCache.has(request.key)) {
          const cachedData = nestedLinkCache.get(request.key);
          request.resolve(cachedData);
          continue;
        }
        
        const response = await sendMessage({
          type: 'FETCH_NESTED_LINKS',
          url: request.url
        });
        
        if (response.success && response.data) {
          const limitedNestedLinks = response.data.nestedLinks.slice(0, CONFIG.NESTED_LINKS_LIMIT);
          
          manageCacheSize();
          nestedLinkCache.set(request.key, {
            ...response.data,
            nestedLinks: limitedNestedLinks
          });
          
          request.resolve({
            ...response.data,
            nestedLinks: limitedNestedLinks
          });
        } else {
          request.reject(new Error('No nested links found'));
        }
      } catch (error) {
        console.error(`Blog Link Analyzer: Queued request failed for ${request.url}:`, error);
        request.reject(error);
      }
    }
    
    isProcessingQueue = false;
    
    // Continue processing if more items in queue
    if (requestQueue.length > 0) {
      setTimeout(processQueue, 100);
    }
  }

  // Setup event listeners with debouncing and cleanup
  function setupEventListeners() {
    // Debounced search to improve performance
    let searchTimeout;
    const debouncedSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applyFilters, 150);
    };

    // Search functionality
    elements.searchInput.addEventListener('input', debouncedSearch);
    
    elements.searchClear.addEventListener('click', () => {
      elements.searchInput.value = '';
      applyFilters();
    });

    // Filter checkboxes
    elements.showInternalOnly.addEventListener('change', applyFilters);
    elements.showExtractedOnly.addEventListener('change', applyFilters);

    // Retry buttons
    elements.retryButton.addEventListener('click', loadBlogData);
    elements.errorRetryButton.addEventListener('click', loadBlogData);

    // Refresh button with error handling
    elements.refreshButton.addEventListener('click', () => {
      try {
        // Clear cached data and reload
        const chromeAPI = getChromeAPI();
        chromeAPI.tabs.reload(currentTabId);
        setTimeout(loadBlogData, 2000);
      } catch (error) {
        console.error('Blog Link Analyzer: Failed to refresh tab:', error);
        showError('Failed to refresh tab: ' + error.message);
      }
    });

    // Settings button - open AI settings
    if (elements.settingsButton) {
      elements.settingsButton.addEventListener('click', () => {
        console.log('Blog Link Analyzer: Settings button clicked');
        showAISettingsModal();
      });
      console.log('Blog Link Analyzer: Settings button listener bound');
    } else {
      console.error('Blog Link Analyzer: Settings button NOT FOUND');
    }

    // Breadcrumb navigation with diagnostics
    if (elements.breadcrumbHome) {
      elements.breadcrumbHome.addEventListener('click', () => {
        console.log('Blog Link Analyzer: Breadcrumb home clicked');
        navigateToRoot();
      });
      console.log('Blog Link Analyzer: Breadcrumb home listener bound');
    } else {
      console.error('Blog Link Analyzer: Breadcrumb home NOT FOUND');
    }

    // AI Settings modal event listeners
    if (elements.closeSettings) {
      elements.closeSettings.addEventListener('click', hideAISettingsModal);
    }
    
    if (elements.aiProvider) {
      elements.aiProvider.addEventListener('change', (e) => {
        updateModelOptions(e.target.value);
        toggleProviderFields(e.target.value);
        // Show/hide custom model option based on provider
        toggleCustomModelOption(e.target.value);
      });
    }
    
    // Custom model checkbox
    if (elements.useCustomModel) {
      elements.useCustomModel.addEventListener('change', (e) => {
        const customModelGroup = document.getElementById('custom-model-group');
        customModelGroup.style.display = e.target.checked ? 'block' : 'none';
      });
    }
    
    if (elements.toggleApiKey) {
      elements.toggleApiKey.addEventListener('click', togglePasswordVisibility);
    }
    
    if (elements.maxTokens) {
      elements.maxTokens.addEventListener('input', (e) => {
        e.target.nextElementSibling.textContent = `${e.target.value} tokens`;
      });
    }
    
    if (elements.temperature) {
      elements.temperature.addEventListener('input', (e) => {
        e.target.nextElementSibling.textContent = e.target.value;
      });
    }
    
    if (elements.testConnection) {
      elements.testConnection.addEventListener('click', testAIConnection);
    }
    
    if (elements.saveSettings) {
      elements.saveSettings.addEventListener('click', saveAISettings);
    }

    // Summary modal event listeners
    if (elements.closeSummary) {
      elements.closeSummary.addEventListener('click', hideSummaryModal);
    }
    
    if (elements.copySummary) {
      elements.copySummary.addEventListener('click', copySummaryToClipboard);
    }
    
    if (elements.regenerateSummary) {
      elements.regenerateSummary.addEventListener('click', regenerateCurrentSummary);
    }

    // Current page summary button
    if (elements.summarizeCurrentPage) {
      elements.summarizeCurrentPage.addEventListener('click', summarizeCurrentPage);
    }

    // Keyboard shortcuts
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        // Check if modal is open, close it first
        const modal = document.getElementById('summary-modal');
        if (modal && modal.style.display === 'flex') {
          hideSummaryModal();
        } else {
          window.close();
        }
      }
      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        elements.refreshButton.click();
      }
      if (e.key === 'r' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        // Check if summary modal is open for regeneration
        const modal = document.getElementById('summary-modal');
        if (modal && modal.style.display === 'flex') {
          e.preventDefault();
          regenerateCurrentSummary();
        }
      }
      if (e.key === '/' && !elements.searchInput.matches(':focus')) {
        e.preventDefault();
        elements.searchInput.focus();
      }
    };
    
    document.addEventListener('keydown', keyHandler);

    // Store cleanup function
    window.cleanupListeners = () => {
      document.removeEventListener('keydown', keyHandler);
      clearTimeout(searchTimeout);
    };
  }

  // Initialize AI Services
  async function initializeAIServices() {
    try {
      console.log('Blog Link Analyzer: Initializing AI services...');
      
      // Initialize service instances
      aiService = new AIService();
      storageManager = new StorageManager();
      contentFetcher = new ContentFetcher();
      
      // Load AI settings
      aiSettings = await storageManager.getAISettings();
      
      console.log('Blog Link Analyzer: AI services initialized successfully');
    } catch (error) {
      console.error('Blog Link Analyzer: Failed to initialize AI services:', error);
      // Don't fail entire initialization if AI services fail
      aiService = null;
      storageManager = null;
      contentFetcher = null;
      aiSettings = null;
    }
  }

  // Initialize elements when DOM is ready
  function initializeElements() {
    const elementIds = [
      'link-count', 'filtered-count', 'current-page', 'search-input', 'search-clear',
      'show-internal-only', 'show-extracted-only', 'loading-section', 'loading-text',
      'loading-progress', 'progress-fill', 'progress-text', 'loading-cancel-button',
      'no-results-section', 'error-section', 'links-section', 'blog-links',
      'retry-button', 'error-retry-button', 'refresh-button', 'settings-button',
      'toast', 'toast-message', 'breadcrumb-section', 'breadcrumb-home',
      'breadcrumb-path', 'links-label', 'ai-settings-modal', 'close-settings',
      'ai-provider', 'ai-model', 'api-key', 'toggle-api-key', 'custom-endpoint',
      'max-tokens', 'temperature', 'cache-summaries', 'auto-summarize',
      'max-depth', 'no-depth-limit', 'custom-model', 'use-custom-model',
      'custom-model-group', 'ai-status-banner', 'banner-icon', 'banner-message',
      'banner-action', 'banner-close', 'test-connection', 'save-settings',
      'summary-modal', 'close-summary', 'summary-title', 'summary-meta',
      'summary-text', 'copy-summary', 'regenerate-summary', 'summarize-current-page'
    ];
    
    elementIds.forEach(id => {
      // Convert kebab-case to camelCase for property names
      const propertyName = id.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
      elements[propertyName] = getElementWithLog(id);
    });
    
    // Log overall DOM state
    console.log('Blog Link Analyzer: DOM Elements Summary:', {
      totalElements: elementIds.length,
      foundElements: Object.values(elements).filter(el => !!el).length,
      missingElements: Object.entries(elements).filter(([id, el]) => !el).map(([id]) => id),
      domReady: document.readyState,
      bodyExists: !!document.body
    });
  }

  // Initialize when DOM is ready with enhanced error handling
  function safeInitialize() {
    try {
      console.log('Blog Link Analyzer: Safe initialize called, readyState:', document.readyState);
      
      if (document.readyState === 'loading') {
        console.log('Blog Link Analyzer: DOM still loading, adding DOMContentLoaded listener');
        document.addEventListener('DOMContentLoaded', initializePopup);
      } else {
        console.log('Blog Link Analyzer: DOM ready, attempting immediate initialization');
        // Use a small timeout to ensure DOM is fully processed
        setTimeout(initializePopup, 10);
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Critical initialization error:', error);
      // Don't call showError here as elements might not be ready
      setTimeout(() => {
        showError('Critical error during initialization: ' + error.message);
      }, 100);
    }
  }

  // Set up periodic keep-alive while popup is open
  let keepAliveInterval;
  
  function startPopupKeepAlive() {
    // Send keep-alive every 15 seconds while popup is open
    keepAliveInterval = setInterval(sendKeepAlive, 15000);
    console.log('Blog Link Analyzer: [POPUP] Started periodic keep-alive');
  }
  
  function stopPopupKeepAlive() {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      console.log('Blog Link Analyzer: [POPUP] Stopped periodic keep-alive');
    }
  }

  // Start keep-alive when popup opens, stop when it closes
  window.addEventListener('load', startPopupKeepAlive);
  window.addEventListener('unload', stopPopupKeepAlive);

  console.log('Blog Link Analyzer: About to call safeInitialize');
  
  // SIMPLIFIED INITIALIZATION - Just try immediately with fallback
  try {
    console.log('Blog Link Analyzer: Attempting immediate initialization');
    safeInitialize();
  } catch (error) {
    console.error('Blog Link Analyzer: Immediate init failed, trying DOMContentLoaded:', error);
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Blog Link Analyzer: DOMContentLoaded fallback');
      try {
        safeInitialize();
      } catch (fallbackError) {
        console.error('Blog Link Analyzer: Fallback also failed:', fallbackError);
        // Last resort - show basic error
        while (document.body.firstChild) {
          document.body.removeChild(document.body.firstChild);
        }
        
        const errorContainer = document.createElement('div');
        errorContainer.style.cssText = 'padding: 20px; text-align: center; color: red;';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Extension Error';
        
        const messageParagraph = document.createElement('p');
        messageParagraph.textContent = `Failed to initialize: ${fallbackError.message}`;
        
        const reloadButton = document.createElement('button');
        reloadButton.textContent = 'Reload';
        reloadButton.addEventListener('click', () => location.reload());
        
        errorContainer.appendChild(heading);
        errorContainer.appendChild(messageParagraph);
        errorContainer.appendChild(reloadButton);
        document.body.appendChild(errorContainer);
      }
    });
  }
  
  // Make regenerate function globally accessible for onclick handlers
  window.regenerateCurrentSummary = regenerateCurrentSummary;
  window.hideSummaryModal = hideSummaryModal;

  console.log('Blog Link Analyzer: Popup script initialization completed');

})();