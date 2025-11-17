// Security audit and input validation improvements
(function() {
  'use strict';

  // Security utilities
  class SecurityUtils {
    // Rate limiting for API calls
    static rateLimiter = new Map();
    
    static checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
      const now = Date.now();
      const requests = this.rateLimiter.get(key) || [];
      
      // Remove old requests outside the window
      const validRequests = requests.filter(time => now - time < windowMs);
      
      if (validRequests.length >= maxRequests) {
        return false;
      }
      
      validRequests.push(now);
      this.rateLimiter.set(key, validRequests);
      return true;
    }

    // Content Security Policy validation
    static validateCSPDirective(directive, value) {
      const allowedDirectives = {
        'script-src': ['\'self\''],
        'connect-src': ['\'self\'', 'https://api.openai.com', 'https://api.anthropic.com', 'http://localhost:11434'],
        'default-src': ['\'self\''],
        'object-src': ['\'none\'']
      };
      
      if (!allowedDirectives[directive]) return false;
      return allowedDirectives[directive].includes(value) || value.startsWith('\'self\'');
    }

    // Input sanitization for AI prompts
    static sanitizePrompt(prompt) {
      if (typeof prompt !== 'string') return '';
      
      // Remove potential injection attempts
      let sanitized = prompt
        .replace(/ignore\s+previous\s+instructions/gi, '')
        .replace(/system\s*:/gi, '')
        .replace(/assistant\s*:/gi, '')
        .replace(/user\s*:/gi, '')
        .trim();
      
      // Limit prompt length
      if (sanitized.length > 5000) {
        sanitized = sanitized.substring(0, 5000);
      }
      
      return sanitized;
    }

    // Validate external URLs before making requests
    static validateExternalUrl(url, allowedDomains) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();
        
        // Check against allowed domains
        if (allowedDomains && allowedDomains.length > 0) {
          return allowedDomains.some(allowed => 
            domain === allowed || domain.endsWith('.' + allowed)
          );
        }
        
        // Default allowed domains for AI services
        const defaultAllowed = [
          'api.openai.com',
          'api.anthropic.com',
          'localhost',
          '127.0.0.1'
        ];
        
        return defaultAllowed.some(allowed => 
          domain === allowed || domain.endsWith('.' + allowed)
        );
      } catch {
        return false;
      }
    }

    // Secure storage operations
    static secureStorage = {
      async set(key, value) {
        try {
          // Encrypt sensitive data if possible
          const encryptedValue = this.encryptSensitiveData(key, value);
          
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({ [key]: encryptedValue });
          } else if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
            await browser.storage.local.set({ [key]: encryptedValue });
          } else {
            localStorage.setItem(key, JSON.stringify(encryptedValue));
          }
        } catch (error) {
          console.error('Secure storage set error:', error);
          throw error;
        }
      },

      async get(key) {
        try {
          let data;
          
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const result = await chrome.storage.local.get(key);
            data = result[key];
          } else if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
            const result = await browser.storage.local.get(key);
            data = result[key];
          } else {
            const stored = localStorage.getItem(key);
            data = stored ? JSON.parse(stored) : null;
          }
          
          // Decrypt sensitive data
          return this.decryptSensitiveData(key, data);
        } catch (error) {
          console.error('Secure storage get error:', error);
          return null;
        }
      },

      encryptSensitiveData(key, value) {
        const sensitiveKeys = ['apiKey', 'openaiApiKey', 'anthropicApiKey'];
        
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
          // Simple obfuscation (in production, use proper encryption)
          return {
            encrypted: true,
            data: btoa(JSON.stringify(value)),
            timestamp: Date.now()
          };
        }
        
        return value;
      },

      decryptSensitiveData(key, value) {
        if (value && typeof value === 'object' && value.encrypted) {
          try {
            return JSON.parse(atob(value.data));
          } catch {
            return null;
          }
        }
        
        return value;
      }
    };

    // API request security
    static secureApiRequest = {
      async makeRequest(url, options = {}) {
        // Validate URL
        if (!SecurityUtils.validateExternalUrl(url)) {
          throw new Error('Invalid or unauthorized URL');
        }

        // Check rate limiting
        const rateLimitKey = `api_${new URL(url).hostname}`;
        if (!SecurityUtils.checkRateLimit(rateLimitKey)) {
          throw new Error('Rate limit exceeded');
        }

        // Secure headers
        const secureHeaders = {
          'Content-Type': 'application/json',
          'User-Agent': 'BlogLinkAnalyzer/1.0',
          ...options.headers
        };

        // Remove sensitive headers
        delete secureHeaders['Authorization'];
        delete secureHeaders['X-API-Key'];

        // Add secure authorization
        if (options.apiKey) {
          secureHeaders['Authorization'] = `Bearer ${options.apiKey}`;
        }

        const secureOptions = {
          ...options,
          headers: secureHeaders,
          mode: 'cors',
          cache: 'no-cache',
          credentials: 'omit'
        };

        try {
          const response = await fetch(url, secureOptions);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return response;
        } catch (error) {
          console.error('Secure API request failed:', error);
          throw error;
        }
      }
    };

    // Content Security Policy enforcement
    static enforceCSP() {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = [
        "script-src 'self'",
        "connect-src 'self' https://api.openai.com https://api.anthropic.com http://localhost:11434",
        "default-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');
      
      document.head.appendChild(meta);
    }

    // XSS prevention
    static preventXSS() {
      // Override dangerous functions
      const originalEval = window.eval;
      window.eval = function(code) {
        throw new Error('eval() is disabled for security');
      };

      // Monitor DOM changes for script injection
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const scripts = node.querySelectorAll ? node.querySelectorAll('script') : [];
              scripts.forEach(script => {
                if (!script.src || script.src.startsWith('blob:')) {
                  script.remove();
                  console.warn('Blocked potentially dangerous script injection');
                }
              });
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // Initialize security measures
  if (typeof window !== 'undefined') {
    // Only run in content script context
    if (window.location && window.location.href.startsWith('http')) {
      SecurityUtils.enforceCSP();
      SecurityUtils.preventXSS();
    }
  }

  // Export security utilities
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      SecurityUtils
    };
  } else {
    window.BlogLinkAnalyzerSecurity = {
      SecurityUtils
    };
  }

})();