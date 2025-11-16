// Blog Link Analyzer Popup Script
(function() {
  'use strict';

  // State management
  let currentTabId = null;
  let blogData = null;
  let filteredLinks = [];
  let expandedItems = new Set();
  let isInitialized = false;

  // DOM elements
  const elements = {
    linkCount: document.getElementById('link-count'),
    filteredCount: document.getElementById('filtered-count'),
    currentPage: document.getElementById('current-page'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    showInternalOnly: document.getElementById('show-internal-only'),
    showExtractedOnly: document.getElementById('show-extracted-only'),
    loadingSection: document.getElementById('loading-section'),
    noResultsSection: document.getElementById('no-results-section'),
    errorSection: document.getElementById('error-section'),
    linksSection: document.getElementById('links-section'),
    blogLinks: document.getElementById('blog-links'),
    retryButton: document.getElementById('retry-button'),
    errorRetryButton: document.getElementById('error-retry-button'),
    refreshButton: document.getElementById('refresh-button'),
    settingsButton: document.getElementById('settings-button')
  };

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

  // Initialize popup with proper error handling and performance monitoring
  async function initializePopup() {
    try {
      console.log('Blog Link Analyzer: Starting popup initialization...');
      performanceMetrics.startTime = performance.now();
      
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
      console.log(`Blog Link Analyzer: Current tab ID: ${currentTabId}`);

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

  // Update current page display
  function updateCurrentPageDisplay(url, title) {
    const pageIndicator = elements.currentPage.querySelector('.page-indicator');
    const hostname = new URL(url).hostname;
    pageIndicator.textContent = `${hostname} - ${title.substring(0, 30)}${title.length > 30 ? '...' : ''}`;
  }

  // Load blog data from background script with timeout and retry
  async function loadBlogData() {
    showLoading();

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Data loading timeout')), 5000);
      });

      const dataPromise = sendMessage({
        type: 'GET_BLOG_DATA',
        tabId: currentTabId
      });

      const response = await Promise.race([dataPromise, timeoutPromise]);

      if (response.success && response.data) {
        blogData = response.data;
        displayResults();
      } else {
        showNoResults('No blog data found for this page.');
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Error loading blog data:', error);
      
      // Retry once for network errors
      if (error.message.includes('timeout') || error.message.includes('network')) {
        console.log('Blog Link Analyzer: Retrying data load...');
        try {
          const retryResponse = await sendMessage({
            type: 'GET_BLOG_DATA',
            tabId: currentTabId
          });
          
          if (retryResponse.success && retryResponse.data) {
            blogData = retryResponse.data;
            displayResults();
            return;
          }
        } catch (retryError) {
          console.error('Blog Link Analyzer: Retry failed:', retryError);
        }
      }
      
      showError('Failed to load blog data: ' + error.message);
    }
  }

  // Display results
  function displayResults() {
    if (!blogData || !blogData.blogLinks || blogData.blogLinks.length === 0) {
      showNoResults('No blog post links found on this page.');
      return;
    }

    hideAllSections();
    elements.linksSection.style.display = 'block';

    // Update counts
    elements.linkCount.textContent = blogData.blogLinks.length;
    
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
    elements.blogLinks.innerHTML = '';

    if (filteredLinks.length === 0) {
      elements.blogLinks.innerHTML = '<div class="no-filtered-results">No links match current filters.</div>';
      return;
    }

    const template = document.getElementById('blog-link-template');
    const fragment = document.createDocumentFragment();
    
    // Batch DOM operations for better performance
    filteredLinks.forEach((link, index) => {
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
      if (link.isInternal) {
        expandButton.addEventListener('click', () => toggleNestedLinks(link.id, expandButton));
      } else {
        expandButton.style.display = 'none';
      }

      // Set up open button
      const openButton = clone.querySelector('.open-button');
      openButton.addEventListener('click', () => openLink(link.href));

      fragment.appendChild(clone);
      
      // Yield to main thread every 10 items to prevent blocking
      if (index % 10 === 0) {
        elements.blogLinks.appendChild(fragment);
        fragment.innerHTML = '';
      }
    });

    // Append remaining items
    if (fragment.children.length > 0) {
      elements.blogLinks.appendChild(fragment);
    }
    
    performanceMetrics.renderTime = performance.now() - renderStart;
    console.log('Blog Link Analyzer: Render performance', {
      linkCount: filteredLinks.length,
      renderTime: Math.round(performanceMetrics.renderTime) + 'ms'
    });
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

  // Load nested links for a blog post
  async function loadNestedLinks(linkId, container) {
    try {
      const link = filteredLinks.find(l => l.id === linkId);
      if (!link) return;

      // Show loading
      container.innerHTML = '<div class="nested-loading">Loading nested links...</div>';

      // Request nested links from background script
      const response = await sendMessage({
        type: 'FETCH_NESTED_LINKS',
        url: link.href
      });

      if (response.success && response.data && response.data.nestedLinks) {
        renderNestedLinks(response.data.nestedLinks, container);
      } else {
        container.innerHTML = '<div class="nested-loading">No nested links found.</div>';
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Error loading nested links:', error);
      container.innerHTML = '<div class="nested-loading">Error loading nested links.</div>';
    }
  }

  // Render nested links
  function renderNestedLinks(nestedLinks, container) {
    if (nestedLinks.length === 0) {
      container.innerHTML = '<div class="nested-loading">No nested links found.</div>';
      return;
    }

    container.innerHTML = '';
    nestedLinks.forEach(nestedLink => {
      const item = document.createElement('div');
      item.className = 'nested-link-item';
      
      const link = document.createElement('a');
      link.href = nestedLink.href;
      link.textContent = nestedLink.title || nestedLink.text || 'Unknown Title';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      item.appendChild(link);
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

  // Show loading state
  function showLoading() {
    hideAllSections();
    elements.loadingSection.style.display = 'block';
  }

  // Show no results state
  function showNoResults(message) {
    hideAllSections();
    elements.noResultsSection.style.display = 'block';
    document.getElementById('no-results-message').textContent = message;
  }

  // Show error state with enhanced information
  function showError(message, errorInfo = null) {
    hideAllSections();
    elements.errorSection.style.display = 'block';
    
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    
    // Add debug information if available
    if (errorInfo) {
      const debugInfo = document.createElement('div');
      debugInfo.className = 'error-debug-info';
      debugInfo.innerHTML = `
        <details>
          <summary>Debug Information</summary>
          <pre>${JSON.stringify(errorInfo, null, 2)}</pre>
        </details>
      `;
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
      strategies.innerHTML = `
        <p class="error-suggestion">Chrome APIs not available. Try:</p>
        <ul>
          <li>Restarting your browser</li>
          <li>Reinstalling the extension</li>
          <li>Checking if extensions are enabled</li>
        </ul>
      `;
    } else if (errorInfo && errorInfo.type === 'InitializationError') {
      strategies.innerHTML = `
        <p class="error-suggestion">Initialization failed. Try:</p>
        <ul>
          <li>Refreshing the page</li>
          <li>Restarting the browser</li>
          <li>Checking browser console for details</li>
        </ul>
      `;
    } else {
      strategies.innerHTML = `
        <p class="error-suggestion">Something went wrong. Try:</p>
        <ul>
          <li>Refreshing the current page</li>
          <li>Checking if the page is a blog post</li>
          <li>Trying again in a few moments</li>
        </ul>
      `;
    }
    
    errorSection.appendChild(strategies);
  }

  // Hide all sections
  function hideAllSections() {
    elements.loadingSection.style.display = 'none';
    elements.noResultsSection.style.display = 'none';
    elements.errorSection.style.display = 'none';
    elements.linksSection.style.display = 'none';
  }

  // Send message to background script with enhanced error handling
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        const chromeAPI = getChromeAPI();
        
        chromeAPI.runtime.sendMessage(message, (response) => {
          if (chromeAPI.runtime.lastError) {
            const error = new Error(chromeAPI.runtime.lastError.message);
            error.code = chromeAPI.runtime.lastError.code;
            reject(error);
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        reject(new Error(`Failed to send message: ${error.message}`));
      }
    });
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

    // Settings button (placeholder)
    elements.settingsButton.addEventListener('click', () => {
      alert('Settings coming soon!');
    });

    // Keyboard shortcuts
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        window.close();
      }
      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        elements.refreshButton.click();
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

  // Initialize when DOM is ready with enhanced error handling
  function safeInitialize() {
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePopup);
      } else {
        // DOM is already ready, initialize immediately
        initializePopup();
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Critical initialization error:', error);
      showError('Critical error during initialization: ' + error.message);
    }
  }

  // Cleanup on popup close
  window.addEventListener('unload', () => {
    if (window.cleanupListeners) {
      window.cleanupListeners();
    }
  });

  // Start initialization
  safeInitialize();

})();