// Blog Link Analyzer Popup Script
(function() {
  'use strict';

  // State management
  let currentTabId = null;
  let blogData = null;
  let filteredLinks = [];
  let expandedItems = new Set();

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

  // Initialize popup
  async function initializePopup() {
    try {
      // Get current tab
      const chrome = typeof browser !== 'undefined' ? browser : chrome;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTabId = tab.id;

      // Update current page display
      updateCurrentPageDisplay(tab.url, tab.title);

      // Load blog data for current tab
      await loadBlogData();

      // Set up event listeners
      setupEventListeners();

    } catch (error) {
      console.error('Blog Link Analyzer: Popup initialization error:', error);
      showError('Failed to initialize popup: ' + error.message);
    }
  }

  // Update current page display
  function updateCurrentPageDisplay(url, title) {
    const pageIndicator = elements.currentPage.querySelector('.page-indicator');
    const hostname = new URL(url).hostname;
    pageIndicator.textContent = `${hostname} - ${title.substring(0, 30)}${title.length > 30 ? '...' : ''}`;
  }

  // Load blog data from background script
  async function loadBlogData() {
    showLoading();

    try {
      const response = await sendMessage({
        type: 'GET_BLOG_DATA',
        tabId: currentTabId
      });

      if (response.success && response.data) {
        blogData = response.data;
        displayResults();
      } else {
        showNoResults('No blog data found for this page.');
      }
    } catch (error) {
      console.error('Blog Link Analyzer: Error loading blog data:', error);
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

  // Render blog links
  function renderBlogLinks() {
    elements.blogLinks.innerHTML = '';

    if (filteredLinks.length === 0) {
      elements.blogLinks.innerHTML = '<div class="no-filtered-results">No links match current filters.</div>';
      return;
    }

    const template = document.getElementById('blog-link-template');
    
    filteredLinks.forEach(link => {
      const clone = template.content.cloneNode(true);
      const item = clone.querySelector('.blog-link-item');
      
      // Set data attributes
      item.dataset.linkId = link.id;
      item.dataset.href = link.href;
      item.dataset.confidence = link.confidence;

      // Set content
      const titleElement = clone.querySelector('.link-title');
      titleElement.textContent = link.title || link.text || 'Unknown Title';
      titleElement.title = link.title || link.text || 'Unknown Title';

      const authorElement = clone.querySelector('.link-author');
      if (link.author) {
        authorElement.textContent = `By ${link.author}`;
      } else {
        authorElement.style.display = 'none';
      }

      const confidenceElement = clone.querySelector('.link-confidence');
      confidenceElement.textContent = `${Math.round(link.confidence * 100)}% confidence`;

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

      elements.blogLinks.appendChild(clone);
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

  // Open link in new tab
  function openLink(href) {
    const chrome = typeof browser !== 'undefined' ? browser : chrome;
    chrome.tabs.create({ url: href });
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

  // Show error state
  function showError(message) {
    hideAllSections();
    elements.errorSection.style.display = 'block';
    document.getElementById('error-message').textContent = message;
  }

  // Hide all sections
  function hideAllSections() {
    elements.loadingSection.style.display = 'none';
    elements.noResultsSection.style.display = 'none';
    elements.errorSection.style.display = 'none';
    elements.linksSection.style.display = 'none';
  }

  // Send message to background script
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      const chrome = typeof browser !== 'undefined' ? browser : chrome;
      
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Setup event listeners
  function setupEventListeners() {
    // Search functionality
    elements.searchInput.addEventListener('input', applyFilters);
    
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

    // Refresh button
    elements.refreshButton.addEventListener('click', () => {
      // Clear cached data and reload
      const chrome = typeof browser !== 'undefined' ? browser : chrome;
      chrome.tabs.reload(currentTabId);
      setTimeout(loadBlogData, 2000);
    });

    // Settings button (placeholder)
    elements.settingsButton.addEventListener('click', () => {
      alert('Settings coming soon!');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.close();
      }
      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        elements.refreshButton.click();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePopup);
  } else {
    initializePopup();
  }

})();