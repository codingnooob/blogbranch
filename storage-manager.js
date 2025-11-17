/**
 * Storage Manager for AI Settings and API Keys
 * Handles secure storage of configuration data
 */

class StorageManager {
  constructor() {
    this.storageKeys = {
      AI_SETTINGS: 'blogAnalyzer_aiSettings',
      API_KEYS: 'blogAnalyzer_apiKeys',
      SUMMARIES: 'blogAnalyzer_summaries',
      USER_PREFERENCES: 'blogAnalyzer_userPreferences'
    };
    
    this.defaultSettings = {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      endpoint: '',
      maxTokens: 500,
      temperature: 0.3,
      autoSummarize: false,
      cacheSummaries: true,
      timeout: 30000,
      maxDepth: 25,
      noDepthLimit: false,
      useCustomModel: false,
      customModel: null
    };
  }

  /**
   * Get AI settings from storage
   * @returns {Promise<Object>} AI settings
   */
  async getAISettings() {
    try {
      const result = await this.get(this.storageKeys.AI_SETTINGS);
      return { ...this.defaultSettings, ...result };
    } catch (error) {
      console.warn('Failed to load AI settings, using defaults:', error);
      return { ...this.defaultSettings };
    }
  }

  /**
   * Save AI settings to storage
   * @param {Object} settings - AI settings to save
   * @returns {Promise<void>}
   */
  async saveAISettings(settings) {
    try {
      await this.set(this.storageKeys.AI_SETTINGS, settings);
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      throw error;
    }
  }

  /**
   * Get API key for a specific provider
   * @param {string} provider - The provider name
   * @returns {Promise<string|null>} API key or null if not found
   */
  async getApiKey(provider) {
    try {
      const apiKeys = await this.get(this.storageKeys.API_KEYS) || {};
      return apiKeys[provider] || null;
    } catch (error) {
      console.warn(`Failed to get API key for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Save API key for a specific provider
   * @param {string} provider - The provider name
   * @param {string} apiKey - The API key to save
   * @returns {Promise<void>}
   */
  async saveApiKey(provider, apiKey) {
    try {
      const apiKeys = await this.get(this.storageKeys.API_KEYS) || {};
      apiKeys[provider] = apiKey;
      await this.set(this.storageKeys.API_KEYS, apiKeys);
    } catch (error) {
      console.error(`Failed to save API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Remove API key for a specific provider
   * @param {string} provider - The provider name
   * @returns {Promise<void>}
   */
  async removeApiKey(provider) {
    try {
      const apiKeys = await this.get(this.storageKeys.API_KEYS) || {};
      delete apiKeys[provider];
      await this.set(this.storageKeys.API_KEYS, apiKeys);
    } catch (error) {
      console.error(`Failed to remove API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get cached summary for a URL
   * @param {string} url - The URL to get summary for
   * @returns {Promise<Object|null>} Cached summary or null
   */
  async getCachedSummary(url) {
    try {
      const summaries = await this.get(this.storageKeys.SUMMARIES) || {};
      const summary = summaries[url];
      
      if (summary && this.isSummaryValid(summary)) {
        return summary;
      }
      
      // Remove expired summary
      if (summary) {
        delete summaries[url];
        await this.set(this.storageKeys.SUMMARIES, summaries);
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to get cached summary for ${url}:`, error);
      return null;
    }
  }

  /**
   * Cache a summary for a URL
   * @param {string} url - The URL
   * @param {Object} summary - The summary data
   * @returns {Promise<void>}
   */
  async cacheSummary(url, summary) {
    try {
      const summaries = await this.get(this.storageKeys.SUMMARIES) || {};
      summaries[url] = {
        ...summary,
        cachedAt: Date.now(),
        url: url
      };
      await this.set(this.storageKeys.SUMMARIES, summaries);
    } catch (error) {
      console.error(`Failed to cache summary for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Clear all cached summaries
   * @returns {Promise<void>}
   */
  async clearCachedSummaries() {
    try {
      await this.set(this.storageKeys.SUMMARIES, {});
    } catch (error) {
      console.error('Failed to clear cached summaries:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences() {
    try {
      return await this.get(this.storageKeys.USER_PREFERENCES) || {};
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
      return {};
    }
  }

  /**
   * Save user preferences
   * @param {Object} preferences - User preferences to save
   * @returns {Promise<void>}
   */
  async saveUserPreferences(preferences) {
    try {
      await this.set(this.storageKeys.USER_PREFERENCES, preferences);
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      throw error;
    }
  }

  /**
   * Check if a cached summary is still valid (not expired)
   * @param {Object} summary - The cached summary
   * @returns {boolean} True if valid, false otherwise
   */
  isSummaryValid(summary) {
    if (!summary.cachedAt) {
      return false;
    }
    
    // Summaries are valid for 7 days
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const age = Date.now() - summary.cachedAt;
    return age < maxAge;
  }

  /**
   * Get storage usage statistics
   * @returns {Promise<Object>} Storage usage info
   */
  async getStorageUsage() {
    try {
      const data = await this.getAll();
      const totalSize = JSON.stringify(data).length;
      
      return {
        totalSize: totalSize,
        totalSizeKB: Math.round(totalSize / 1024),
        itemCount: Object.keys(data).length,
        keys: Object.keys(data)
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return {
        totalSize: 0,
        totalSizeKB: 0,
        itemCount: 0,
        keys: []
      };
    }
  }

  /**
   * Clear all extension data
   * @returns {Promise<void>}
   */
  async clearAllData() {
    try {
      await this.clear();
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  /**
   * Export settings as JSON
   * @returns {Promise<string>} JSON string of settings
   */
  async exportSettings() {
    try {
      const settings = await this.getAISettings();
      const apiKeys = await this.get(this.storageKeys.API_KEYS) || {};
      const preferences = await this.getUserPreferences();
      
      // Don't export actual API keys for security
      const sanitizedApiKeys = {};
      Object.keys(apiKeys).forEach(provider => {
        sanitizedApiKeys[provider] = apiKeys[provider] ? '[CONFIGURED]' : '';
      });
      
      return JSON.stringify({
        settings,
        apiKeys: sanitizedApiKeys,
        preferences,
        exportedAt: new Date().toISOString()
      }, null, 2);
    } catch (error) {
      console.error('Failed to export settings:', error);
      throw error;
    }
  }

  /**
   * Import settings from JSON
   * @param {string} jsonSettings - JSON string of settings
   * @returns {Promise<void>}
   */
  async importSettings(jsonSettings) {
    try {
      const data = JSON.parse(jsonSettings);
      
      if (data.settings) {
        await this.saveAISettings(data.settings);
      }
      
      if (data.preferences) {
        await this.saveUserPreferences(data.preferences);
      }
      
      // Note: API keys are not imported for security reasons
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }

  // Browser storage abstraction methods
  async get(key) {
    if (typeof browser !== 'undefined' && browser.storage) {
      const result = await browser.storage.local.get(key);
      return result[key];
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(key);
      return result[key];
    } else {
      // Fallback to localStorage
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }
  }

  async set(key, value) {
    if (typeof browser !== 'undefined' && browser.storage) {
      await browser.storage.local.set({ [key]: value });
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [key]: value });
    } else {
      // Fallback to localStorage
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  async getAll() {
    if (typeof browser !== 'undefined' && browser.storage) {
      return await browser.storage.local.get(null);
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
      return await chrome.storage.local.get(null);
    } else {
      // Fallback to localStorage
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('blogAnalyzer_')) {
          result[key] = JSON.parse(localStorage.getItem(key));
        }
      }
      return result;
    }
  }

  async clear() {
    if (typeof browser !== 'undefined' && browser.storage) {
      await browser.storage.local.clear();
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.clear();
    } else {
      // Fallback to localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('blogAnalyzer_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
} else if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}