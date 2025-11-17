const { generateSummary } = require('../utils/ai-service.js');

describe('AI Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    global.chrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should generate summary with OpenAI', async () => {
    // Mock OpenAI configuration
    chrome.storage.local.get.mockResolvedValue({
      aiProvider: 'openai',
      openaiApiKey: 'test-key',
      model: 'gpt-3.5-turbo'
    });

    // Mock OpenAI API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'This is a test summary of the blog post.'
          }
        }]
      })
    });

    const content = 'This is a long blog post content...';
    const summary = await generateSummary(content);

    expect(summary).toBe('This is a test summary of the blog post.');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key'
        })
      })
    );
  });

  test('should handle OpenAI API errors', async () => {
    chrome.storage.local.get.mockResolvedValue({
      aiProvider: 'openai',
      openaiApiKey: 'test-key'
    });

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid API key' })
    });

    const content = 'Test content';
    
    await expect(generateSummary(content)).rejects.toThrow();
  });

  test('should generate summary with Anthropic', async () => {
    chrome.storage.local.get.mockResolvedValue({
      aiProvider: 'anthropic',
      anthropicApiKey: 'test-key'
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{
          text: 'Anthropic summary here.'
        }]
      })
    });

    const content = 'Blog post content';
    const summary = await generateSummary(content);

    expect(summary).toBe('Anthropic summary here.');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-key'
        })
      })
    );
  });

  test('should handle Ollama local API', async () => {
    chrome.storage.local.get.mockResolvedValue({
      aiProvider: 'ollama',
      ollamaUrl: 'http://localhost:11434',
      model: 'llama2'
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Ollama generated summary.'
      })
    });

    const content = 'Test blog post';
    const summary = await generateSummary(content);

    expect(summary).toBe('Ollama generated summary.');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  test('should cache summaries when enabled', async () => {
    chrome.storage.local.get.mockResolvedValue({
      aiProvider: 'openai',
      openaiApiKey: 'test-key',
      enableCaching: true
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Cached summary' }
        }]
      })
    });

    const content = 'Test content';
    await generateSummary(content);

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'summary-cache-123': expect.objectContaining({
          summary: 'Cached summary',
          timestamp: expect.any(Number)
        })
      })
    );
  });

  test('should return cached summary when available', async () => {
    const cachedData = {
      'summary-cache-123': {
        summary: 'Cached result',
        timestamp: Date.now() - 1000 // 1 second ago
      }
    };

    chrome.storage.local.get.mockResolvedValue({
      aiProvider: 'openai',
      openaiApiKey: 'test-key',
      enableCaching: true,
      ...cachedData
    });

    const content = 'Test content';
    const summary = await generateSummary(content);

    expect(summary).toBe('Cached result');
    expect(fetch).not.toHaveBeenCalled();
  });
});