/**
 * AI Service Abstraction Layer
 * Supports multiple AI providers for blog post summarization
 */

class AIService {
  constructor() {
    this.providers = {
      openai: {
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo-preview'],
        defaultModel: 'gpt-3.5-turbo',
        defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
        requiresApiKey: true,
        maxTokens: 4000
      },
      anthropic: {
        name: 'Anthropic',
        models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
        defaultModel: 'claude-3-haiku-20240307',
        defaultEndpoint: 'https://api.anthropic.com/v1/messages',
        requiresApiKey: true,
        maxTokens: 4000
      },
      ollama: {
        name: 'Ollama (Local)',
        models: [], // Will be populated dynamically
        defaultModel: 'llama2',
        defaultEndpoint: 'http://localhost:11434',
        requiresApiKey: false,
        maxTokens: 4000
      },
      custom: {
        name: 'Custom API',
        models: [], // User defined
        defaultModel: 'custom-model',
        defaultEndpoint: '',
        requiresApiKey: false,
        maxTokens: 4000
      }
    };
  }

  /**
   * Generate a summary for the given content
   * @param {Object} config - Configuration object
   * @param {string} config.content - The content to summarize
   * @param {string} config.provider - The AI provider to use
   * @param {string} config.model - The model to use (can be custom)
   * @param {string} config.apiKey - API key if required
   * @param {string} config.endpoint - Custom endpoint
   * @param {number} config.maxTokens - Maximum tokens for response
   * @returns {Promise<string>} The generated summary
   */
  async summarize({ content, provider, model, apiKey, endpoint, maxTokens = 500 }) {
    if (!content || content.trim().length === 0) {
      throw new Error('Content is required for summarization');
    }

    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    if (providerConfig.requiresApiKey && !apiKey) {
      throw new Error(`API key is required for ${providerConfig.name}`);
    }

    const truncatedContent = this.truncateContent(content, providerConfig.maxTokens);
    const prompt = this.buildSummaryPrompt(truncatedContent);

    // Use the provided model (could be custom) or fallback to default
    const finalModel = model || providerConfig.defaultModel;
    
    switch (provider) {
      case 'openai':
        return this.summarizeWithOpenAI(prompt, finalModel, apiKey, endpoint || providerConfig.defaultEndpoint, maxTokens);
      case 'anthropic':
        return this.summarizeWithAnthropic(prompt, finalModel, apiKey, endpoint || providerConfig.defaultEndpoint, maxTokens);
      case 'ollama':
        return this.summarizeWithOllama(prompt, finalModel, endpoint || providerConfig.defaultEndpoint, maxTokens);
      case 'custom':
        return this.summarizeWithCustom(prompt, finalModel, apiKey, endpoint, maxTokens);
      default:
        throw new Error(`Provider ${provider} not implemented`);
    }
  }

  /**
   * Truncate content to fit within token limits
   */
  truncateContent(content, maxTokens) {
    // Rough estimation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    if (content.length <= maxChars) {
      return content;
    }
    return content.substring(0, maxChars - 100) + '...';
  }

  /**
   * Build the summary prompt
   */
  buildSummaryPrompt(content) {
    return `Please provide a concise summary of the following blog post. Focus on the main points, key insights, and overall message. Keep the summary to 2-3 sentences maximum.

Blog Post Content:
${content}

Summary:`;
  }

  /**
   * Summarize using OpenAI API
   */
  async summarizeWithOpenAI(prompt, model, apiKey, endpoint, maxTokens) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  /**
   * Summarize using Anthropic API
   */
  async summarizeWithAnthropic(prompt, model, apiKey, endpoint, maxTokens) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
  }

  /**
   * Summarize using Ollama (local)
   */
  async summarizeWithOllama(prompt, model, endpoint, maxTokens) {
    // For Ollama, append /api/generate to endpoint if not already present
    let generateUrl;
    if (endpoint.includes('/api/generate')) {
      generateUrl = endpoint;
    } else {
      generateUrl = endpoint.endsWith('/') ? `${endpoint}api/generate` : `${endpoint}/api/generate`;
    }

    const response = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: maxTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response.trim();
  }

  /**
   * Summarize using custom API endpoint
   */
  async summarizeWithCustom(prompt, model, apiKey, endpoint, maxTokens) {
    if (!endpoint) {
      throw new Error('Custom endpoint is required');
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        max_tokens: maxTokens,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Try common response formats
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    } else if (data.response) {
      return data.response.trim();
    } else if (data.content) {
      return data.content.trim();
    } else if (data.text) {
      return data.text.trim();
    } else {
      throw new Error('Unable to parse response from custom API');
    }
  }

  /**
   * Test connection to AI provider
   */
  async testConnection(provider, apiKey, endpoint, model) {
    const testContent = "This is a test blog post about artificial intelligence. AI is transforming many industries.";
    try {
      const summary = await this.summarize({
        content: testContent,
        provider,
        model,
        apiKey,
        endpoint,
        maxTokens: 50
      });
      return { success: true, summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available models for a provider
   */
  async getModels(provider, endpoint, apiKey) {
    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // For providers with static model lists, return them directly
    if (provider !== 'ollama' && provider !== 'custom') {
      return providerConfig.models;
    }

    // For Ollama, fetch available models dynamically
    if (provider === 'ollama') {
      try {
        // Use provider's default endpoint if none provided
        const finalEndpoint = endpoint || providerConfig.defaultEndpoint;
        
        // Check if endpoint is accessible
        if (!finalEndpoint || (!finalEndpoint.startsWith('http://') && !finalEndpoint.startsWith('https://'))) {
          throw new Error('Invalid Ollama endpoint URL');
        }

        // For Ollama, construct the correct API tags URL
        // If endpoint already includes /api/generate, replace it with /api/tags
        // Otherwise, just append /api/tags
        let modelsUrl;
        if (finalEndpoint.includes('/api/generate')) {
          modelsUrl = finalEndpoint.replace('/api/generate', '/api/tags');
        } else {
          modelsUrl = finalEndpoint.endsWith('/') ? `${finalEndpoint}api/tags` : `${finalEndpoint}/api/tags`;
        }

        const response = await fetch(modelsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.models || !Array.isArray(data.models)) {
          throw new Error('Invalid response format from Ollama');
        }

        return data.models.map(model => model.name);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn('Ollama models request timed out, using defaults');
        } else {
          console.warn('Failed to fetch Ollama models, using defaults:', error.message);
        }
        return ['llama2', 'mistral', 'codellama'];
      }
    }

    // For custom provider, return empty array (user must specify)
    return [];
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(provider) {
    return this.providers[provider];
  }

  /**
   * Get all available providers
   */
  getProviders() {
    return Object.keys(this.providers).map(key => ({
      id: key,
      ...this.providers[key]
    }));
  }
}

// Create a default instance for convenience functions
const aiService = new AIService();

// Convenience function for backward compatibility
async function generateSummary(content, options = {}) {
  // Check cache first if available
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const cacheKey = `summary-cache-${content.substring(0, 123)}`;
      const cached = await chrome.storage.local.get(cacheKey);
      if (cached[cacheKey]) {
        return cached[cacheKey].summary;
      }
    } catch (error) {
      console.error('Error checking cache:', error);
    }
  }
  
  // Get configuration from chrome storage if available
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const result = await chrome.storage.local.get(['aiProvider', 'openaiApiKey', 'anthropicApiKey', 'model', 'ollamaUrl', 'customUrl', 'customApiKey']);
      let endpoint = result.ollamaUrl || result.customUrl;
      // For Ollama, append /api/generate if not already present
      if (result.aiProvider === 'ollama' && endpoint && !endpoint.endsWith('/api/generate')) {
        endpoint = endpoint.endsWith('/') ? endpoint + 'api/generate' : endpoint + '/api/generate';
      }
      
      const config = {
        provider: result.aiProvider || 'openai',
        apiKey: result.openaiApiKey || result.anthropicApiKey || result.customApiKey,
        model: result.model,
        endpoint: endpoint
      };
      const summary = await aiService.summarize({ content, ...config, ...options });
      
      // Cache the result
      try {
        const cacheKey = `summary-cache-${content.substring(0, 123)}`;
        await chrome.storage.local.set({
          [cacheKey]: {
            summary: summary,
            timestamp: Date.now()
          }
        });
      } catch (error) {
        console.error('Error caching result:', error);
      }
      
      return summary;
    } catch (error) {
      console.error('Error getting AI config:', error);
    }
  }
  
  // Fallback to provided options or defaults
  return aiService.summarize({ content, ...options });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AIService,
    generateSummary
  };
} else if (typeof window !== 'undefined') {
  window.AIService = AIService;
  window.generateSummary = generateSummary;
}