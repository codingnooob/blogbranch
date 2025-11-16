// Error handling and edge case management utilities
(function() {
  'use strict';

  // Error types
  const ErrorTypes = {
    NETWORK_ERROR: 'network_error',
    PARSE_ERROR: 'parse_error',
    PERMISSION_ERROR: 'permission_error',
    TIMEOUT_ERROR: 'timeout_error',
    VALIDATION_ERROR: 'validation_error',
    STORAGE_ERROR: 'storage_error',
    CONTENT_SCRIPT_ERROR: 'content_script_error'
  };

  // Custom error class
  class ExtensionError extends Error {
    constructor(message, type, details = {}) {
      super(message);
      this.name = 'ExtensionError';
      this.type = type;
      this.details = details;
      this.timestamp = Date.now();
    }
  }

  // Error handler utility
  class ErrorHandler {
    constructor() {
      this.errorLog = [];
      this.maxLogSize = 100;
    }

    // Log error
    logError(error, context = {}) {
      const errorEntry = {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
          type: error.type || ErrorTypes.VALIDATION_ERROR,
          details: error.details || {}
        } : error,
        context: context,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location?.href || 'unknown'
      };

      this.errorLog.push(errorEntry);
      
      // Trim log if it gets too large
      if (this.errorLog.length > this.maxLogSize) {
        this.errorLog = this.errorLog.slice(-this.maxLogSize);
      }

      console.error('Blog Link Analyzer Error:', errorEntry);
    }

    // Get recent errors
    getRecentErrors(count = 10) {
      return this.errorLog.slice(-count);
    }

    // Clear error log
    clearLog() {
      this.errorLog = [];
    }

    // Handle network errors
    handleNetworkError(error, url) {
      const extensionError = new ExtensionError(
        `Network error accessing ${url}: ${error.message}`,
        ErrorTypes.NETWORK_ERROR,
        { url, originalError: error }
      );
      this.logError(extensionError, { action: 'network_request' });
      return extensionError;
    }

    // Handle parse errors
    handleParseError(error, content, source) {
      const extensionError = new ExtensionError(
        `Parse error in ${source}: ${error.message}`,
        ErrorTypes.PARSE_ERROR,
        { content: content.substring(0, 200), source }
      );
      this.logError(extensionError, { action: 'parsing' });
      return extensionError;
    }

    // Handle timeout errors
    handleTimeoutError(operation, timeout) {
      const extensionError = new ExtensionError(
        `Operation "${operation}" timed out after ${timeout}ms`,
        ErrorTypes.TIMEOUT_ERROR,
        { operation, timeout }
      );
      this.logError(extensionError, { action: 'timeout' });
      return extensionError;
    }

    // Handle validation errors
    handleValidationError(message, data) {
      const extensionError = new ExtensionError(
        `Validation error: ${message}`,
        ErrorTypes.VALIDATION_ERROR,
        { data }
      );
      this.logError(extensionError, { action: 'validation' });
      return extensionError;
    }

    // Handle storage errors
    handleStorageError(error, operation, key) {
      const extensionError = new ExtensionError(
        `Storage error during ${operation} on ${key}: ${error.message}`,
        ErrorTypes.STORAGE_ERROR,
        { operation, key }
      );
      this.logError(extensionError, { action: 'storage' });
      return extensionError;
    }
  }

  // Input validation utilities
  class Validator {
    // Validate URL
    static isValidUrl(url) {
      try {
        const urlObj = new URL(url);
        return ['http:', 'https:'].includes(urlObj.protocol);
      } catch {
        return false;
      }
    }

    // Validate blog link data
    static validateBlogLink(link) {
      const errors = [];

      if (!link.href || !Validator.isValidUrl(link.href)) {
        errors.push('Invalid or missing href');
      }

      if (!link.text || typeof link.text !== 'string' || link.text.trim().length === 0) {
        errors.push('Invalid or missing text');
      }

      if (link.confidence !== undefined && (typeof link.confidence !== 'number' || link.confidence < 0 || link.confidence > 1)) {
        errors.push('Invalid confidence value');
      }

      return {
        isValid: errors.length === 0,
        errors: errors
      };
    }

    // Validate blog data
    static validateBlogData(data) {
      const errors = [];

      if (!data || typeof data !== 'object') {
        errors.push('Invalid data object');
        return { isValid: false, errors };
      }

      if (data.blogLinks && !Array.isArray(data.blogLinks)) {
        errors.push('blogLinks must be an array');
      }

      if (data.blogLinks) {
        data.blogLinks.forEach((link, index) => {
          const linkValidation = Validator.validateBlogLink(link);
          if (!linkValidation.isValid) {
            errors.push(`Invalid blog link at index ${index}: ${linkValidation.errors.join(', ')}`);
          }
        });
      }

      return {
        isValid: errors.length === 0,
        errors: errors
      };
    }

    // Sanitize text
    static sanitizeText(text) {
      if (typeof text !== 'string') return '';
      return text.trim().substring(0, 500); // Limit length
    }

    // Sanitize URL
    static sanitizeUrl(url) {
      if (!url || typeof url !== 'string') return '';
      try {
        const urlObj = new URL(url, window.location.href);
        return urlObj.href;
      } catch {
        return '';
      }
    }
  }

  // Retry utility
  class RetryHandler {
    static async withRetry(operation, maxRetries = 3, delay = 1000, backoff = 2) {
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          
          if (attempt === maxRetries) {
            throw error;
          }

          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, attempt - 1)));
        }
      }

      throw lastError;
    }
  }

  // Timeout utility
  class TimeoutHandler {
    static withTimeout(promise, timeoutMs) {
      return Promise.race([
        promise,
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new ExtensionError(
              `Operation timed out after ${timeoutMs}ms`,
              ErrorTypes.TIMEOUT_ERROR,
              { timeout: timeoutMs }
            ));
          }, timeoutMs);
        })
      ]);
    }
  }

  // Performance monitor
  class PerformanceMonitor {
    constructor() {
      this.metrics = {};
    }

    // Start timing an operation
    start(operation) {
      this.metrics[operation] = {
        startTime: performance.now(),
        endTime: null,
        duration: null
      };
    }

    // End timing an operation
    end(operation) {
      if (this.metrics[operation]) {
        this.metrics[operation].endTime = performance.now();
        this.metrics[operation].duration = 
          this.metrics[operation].endTime - this.metrics[operation].startTime;
      }
    }

    // Get metrics
    getMetrics() {
      return this.metrics;
    }

    // Clear metrics
    clear() {
      this.metrics = {};
    }
  }

  // Create global instances
  const errorHandler = new ErrorHandler();
  const performanceMonitor = new PerformanceMonitor();

  // Export utilities
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      ErrorTypes,
      ExtensionError,
      ErrorHandler,
      Validator,
      RetryHandler,
      TimeoutHandler,
      PerformanceMonitor,
      errorHandler,
      performanceMonitor
    };
  } else {
    window.BlogLinkAnalyzerUtils = {
      ErrorTypes,
      ExtensionError,
      ErrorHandler,
      Validator,
      RetryHandler,
      TimeoutHandler,
      PerformanceMonitor,
      errorHandler,
      performanceMonitor
    };
  }

})();