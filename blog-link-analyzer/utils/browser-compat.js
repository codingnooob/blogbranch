// Cross-browser compatibility layer
(function(global) {
  'use strict';

  // Detect browser
  const isChrome = typeof chrome !== 'undefined' && chrome.runtime;
  const isFirefox = typeof browser !== 'undefined' && browser.runtime;

  // Create unified API
  const extensionAPI = {
    // Runtime API
    runtime: {
      sendMessage: function(message, callback) {
        if (isChrome) {
          return chrome.runtime.sendMessage(message, callback);
        } else if (isFirefox) {
          return browser.runtime.sendMessage(message).then(callback).catch(callback);
        }
      },
      onMessage: {
        addListener: function(listener) {
          if (isChrome) {
            chrome.runtime.onMessage.addListener(listener);
          } else if (isFirefox) {
            browser.runtime.onMessage.addListener(listener);
          }
        }
      },
      getURL: function(path) {
        if (isChrome) {
          return chrome.runtime.getURL(path);
        } else if (isFirefox) {
          return browser.runtime.getURL(path);
        }
      },
      id: isChrome ? chrome.runtime.id : (isFirefox ? browser.runtime.id : null)
    },

    // Tabs API
    tabs: {
      query: function(queryInfo) {
        if (isChrome) {
          return chrome.tabs.query(queryInfo);
        } else if (isFirefox) {
          return browser.tabs.query(queryInfo);
        }
      },
      create: function(createProperties) {
        if (isChrome) {
          return chrome.tabs.create(createProperties);
        } else if (isFirefox) {
          return browser.tabs.create(createProperties);
        }
      },
      sendMessage: function(tabId, message, callback) {
        if (isChrome) {
          return chrome.tabs.sendMessage(tabId, message, callback);
        } else if (isFirefox) {
          return browser.tabs.sendMessage(tabId, message).then(callback).catch(callback);
        }
      },
      remove: function(tabIds) {
        if (isChrome) {
          return chrome.tabs.remove(tabIds);
        } else if (isFirefox) {
          return browser.tabs.remove(tabIds);
        }
      },
      onUpdated: {
        addListener: function(listener) {
          if (isChrome) {
            chrome.tabs.onUpdated.addListener(listener);
          } else if (isFirefox) {
            browser.tabs.onUpdated.addListener(listener);
          }
        }
      },
      onRemoved: {
        addListener: function(listener) {
          if (isChrome) {
            chrome.tabs.onRemoved.addListener(listener);
          } else if (isFirefox) {
            browser.tabs.onRemoved.addListener(listener);
          }
        }
      }
    },

    // Storage API
    storage: {
      local: {
        get: function(keys) {
          if (isChrome) {
            return chrome.storage.local.get(keys);
          } else if (isFirefox) {
            return browser.storage.local.get(keys);
          }
        },
        set: function(items) {
          if (isChrome) {
            return chrome.storage.local.set(items);
          } else if (isFirefox) {
            return browser.storage.local.set(items);
          }
        }
      }
    },

    // Alarms API (for background cleanup)
    alarms: {
      create: function(name, alarmInfo) {
        if (isChrome) {
          return chrome.alarms.create(name, alarmInfo);
        } else if (isFirefox) {
          return browser.alarms.create(name, alarmInfo);
        }
      },
      onAlarm: {
        addListener: function(listener) {
          if (isChrome) {
            chrome.alarms.onAlarm.addListener(listener);
          } else if (isFirefox) {
            browser.alarms.onAlarm.addListener(listener);
          }
        }
      }
    },

    // Extension lifecycle events
      onInstalled: {
        addListener: function(listener) {
          if (isChrome) {
            chrome.runtime.onInstalled.addListener(listener);
          } else if (isFirefox) {
            browser.runtime.onInstalled.addListener(listener);
          }
        }
      },
      onStartup: {
        addListener: function(listener) {
          if (isChrome) {
            chrome.runtime.onStartup.addListener(listener);
          } else if (isFirefox) {
            browser.runtime.onStartup.addListener(listener);
          }
        }
      }
  };

  // Export the unified API
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = extensionAPI;
  } else {
    global.extensionAPI = extensionAPI;
  }

})(typeof window !== 'undefined' ? window : this);