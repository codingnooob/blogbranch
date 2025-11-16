// Blog Link Analyzer Popup Script
(function() {
  'use strict';
  
  console.log('Blog Link Analyzer: Popup script loaded');

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
  
  // Configuration
  const CONFIG = {
    MAX_DEPTH: 10, // Maximum nesting depth to prevent infinite loops
    MAX_CACHE_SIZE: 200, // Maximum number of cached nested link sets
    MAX_VISIBLE_LINKS: 100, // Maximum links to show at once for performance
    NESTED_LINKS_LIMIT: 50 // Maximum nested links to fetch per page
  };

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
    settingsButton: document.getElementById('settings-button'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
    breadcrumbSection: document.getElementById('breadcrumb-section'),
    breadcrumbHome: document.getElementById('breadcrumb-home'),
    breadcrumbPath: document.getElementById('breadcrumb-path'),
    linksLabel: document.getElementById('links-label')
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
      console.log(`Blog Link Analyzer: Current tab ID: ${currentTabId}, URL: ${tab.url}`);

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
    console.log('Blog Link Analyzer: Starting to load blog data...');
    showLoading();

    // Add timeout to prevent hanging
    let loadingTimeout;
    const timeoutPromise = new Promise((_, reject) => {
      loadingTimeout = setTimeout(() => {
        reject(new Error('Data loading timeout after 10 seconds'));
      }, 10000);
    });

    try {
      console.log(`Blog Link Analyzer: Requesting blog data for tab ID: ${currentTabId}`);
      const dataPromise = sendMessage({
        type: 'GET_BLOG_DATA',
        tabId: currentTabId
      });

      const response = await Promise.race([dataPromise, timeoutPromise]);
      clearTimeout(loadingTimeout);

      console.log('Blog Link Analyzer: Received response:', response);

      if (response && response.success && response.data) {
        blogData = response.data;
        console.log('Blog Link Analyzer: Blog data loaded successfully:', {
          isBlog: blogData.isBlog,
          linkCount: blogData.blogLinks ? blogData.blogLinks.length : 0
        });
        displayResults();
      } else {
        console.log('Blog Link Analyzer: No blog data found');
        showNoResults('No blog data found for this page.');
      }
    } catch (error) {
      clearTimeout(loadingTimeout);
      console.error('Blog Link Analyzer: Error loading blog data:', error);
      
      // Retry once for network errors
      if (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('message channel')) {
        console.log('Blog Link Analyzer: Retrying data load...');
        try {
          const retryResponse = await sendMessage({
            type: 'GET_BLOG_DATA',
            tabId: currentTabId
          });
          
          if (retryResponse && retryResponse.success && retryResponse.data) {
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
    console.log('Blog Link Analyzer: Displaying results...', {
      hasBlogData: !!blogData,
      hasBlogLinks: !!(blogData && blogData.blogLinks),
      linkCount: blogData && blogData.blogLinks ? blogData.blogLinks.length : 0
    });

    if (!blogData || !blogData.blogLinks || blogData.blogLinks.length === 0) {
      console.log('Blog Link Analyzer: No blog links found, showing no results');
      showNoResults('No blog post links found on this page.');
      return;
    }

    console.log('Blog Link Analyzer: Showing results with', blogData.blogLinks.length, 'links');
    hideAllSections();
    elements.linksSection.style.display = 'block';

    // Initialize navigation state
    navigateToRoot();
    
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
      if (link.isInternal && currentDepth < CONFIG.MAX_DEPTH) {
        expandButton.addEventListener('click', () => toggleNestedLinks(link.id, expandButton));
        expandButton.title = `Explore links from "${link.title || link.text}"`;
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

  // Enhanced cache management
  function manageCacheSize() {
    if (nestedLinkCache.size >= CONFIG.MAX_CACHE_SIZE) {
      // Remove oldest entries (simple FIFO for now)
      const keysToDelete = Array.from(nestedLinkCache.keys()).slice(0, Math.floor(CONFIG.MAX_CACHE_SIZE * 0.2));
      keysToDelete.forEach(key => nestedLinkCache.delete(key));
      console.log(`Blog Link Analyzer: Cache cleanup - removed ${keysToDelete.length} entries`);
    }
  }

  // Load nested links for a blog post
  async function loadNestedLinks(linkId, container) {
    try {
      const link = filteredLinks.find(l => l.id === linkId);
      if (!link) return;

      // Check cache first
      const cacheKey = `${link.href}_${currentDepth}`;
      if (nestedLinkCache.has(cacheKey)) {
        const cachedData = nestedLinkCache.get(cacheKey);
        renderNestedLinks(cachedData.nestedLinks, container, link);
        return;
      }

      // Show loading
      container.innerHTML = '<div class="nested-loading">Loading nested links...</div>';

      // Request nested links from background script
      const response = await sendMessage({
        type: 'FETCH_NESTED_LINKS',
        url: link.href
      });

      if (response.success && response.data && response.data.nestedLinks) {
        // Limit nested links for performance
        const limitedNestedLinks = response.data.nestedLinks.slice(0, CONFIG.NESTED_LINKS_LIMIT);
        
        // Cache results with size management
        manageCacheSize();
        nestedLinkCache.set(cacheKey, {
          ...response.data,
          nestedLinks: limitedNestedLinks
        });
        
        // Add depth information to nested links
        const nestedLinksWithDepth = limitedNestedLinks.map(nestedLink => ({
          ...nestedLink,
          depth: currentDepth + 1,
          parentLink: link
        }));
        
        renderNestedLinks(nestedLinksWithDepth, container, link);
      } else {
        container.innerHTML = '<div class="nested-loading">No nested links found.</div>';
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Error loading nested links:', error);
      container.innerHTML = '<div class="nested-loading">Error loading nested links.</div>';
    }
  }

  // Render nested links
  function renderNestedLinks(nestedLinks, container, parentLink = null) {
    if (nestedLinks.length === 0) {
      container.innerHTML = '<div class="nested-loading">No nested links found.</div>';
      return;
    }

    container.innerHTML = '';
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

  // Show toast notification
  function showToast(message, duration = 3000) {
    if (!elements.toast || !elements.toastMessage) return;
    
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('show');
    
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
    elements.breadcrumbPath.innerHTML = '';
    
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
      showToast('Settings coming soon! 🚧');
    });

    // Breadcrumb navigation
    elements.breadcrumbHome.addEventListener('click', navigateToRoot);

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
      console.log('Blog Link Analyzer: Safe initialize called, readyState:', document.readyState);
      if (document.readyState === 'loading') {
        console.log('Blog Link Analyzer: Adding DOMContentLoaded listener');
        document.addEventListener('DOMContentLoaded', initializePopup);
      } else {
        console.log('Blog Link Analyzer: DOM already ready, initializing immediately');
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
  console.log('Blog Link Analyzer: About to call safeInitialize');
  
  // Test if popup is working
  setTimeout(() => {
    console.log('Blog Link Analyzer: Popup test timeout reached');
    const loadingSection = document.getElementById('loading-section');
    if (loadingSection) {
      console.log('Blog Link Analyzer: Loading section found, updating text');
      loadingSection.querySelector('.loading-text').textContent = 'Popup is working but stuck...';
    } else {
      console.log('Blog Link Analyzer: Loading section NOT found');
    }
  }, 2000);
  
  safeInitialize();
  }
})();
