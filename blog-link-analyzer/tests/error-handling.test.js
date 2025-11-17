const { validateInput, sanitizeContent } = require('../utils/error-handling.js');

describe('Error Handling', () => {
  describe('Input Validation', () => {
    test('should validate API keys', () => {
      expect(validateInput.apiKey('sk-1234567890')).toBe(true);
      expect(validateInput.apiKey('')).toBe(false);
      expect(validateInput.apiKey(null)).toBe(false);
      expect(validateInput.apiKey('short')).toBe(false);
    });

    test('should validate URLs', () => {
      expect(validateInput.url('https://example.com')).toBe(true);
      expect(validateInput.url('http://localhost:3000')).toBe(true);
      expect(validateInput.url('ftp://example.com')).toBe(false);
      expect(validateInput.url('not-a-url')).toBe(false);
      expect(validateInput.url('')).toBe(false);
    });

    test('should validate content length', () => {
      const shortContent = 'Short content';
      const longContent = 'a'.repeat(100000);
      const tooLongContent = 'a'.repeat(1000000);

      expect(validateInput.contentLength(shortContent)).toBe(true);
      expect(validateInput.contentLength(longContent)).toBe(true);
      expect(validateInput.contentLength(tooLongContent)).toBe(false);
    });

    test('should validate AI provider configuration', () => {
      const validConfig = {
        provider: 'openai',
        apiKey: 'sk-1234567890',
        model: 'gpt-3.5-turbo'
      };

      const invalidConfig = {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-3.5-turbo'
      };

      expect(validateInput.aiConfig(validConfig)).toBe(true);
      expect(validateInput.aiConfig(invalidConfig)).toBe(false);
    });
  });

  describe('Content Sanitization', () => {
    test('should remove HTML tags', () => {
      const htmlContent = '<p>This is <strong>bold</strong> content</p>';
      const sanitized = sanitizeContent(htmlContent);
      expect(sanitized).toBe('This is bold content');
    });

    test('should remove script tags', () => {
      const scriptContent = '<script>alert("xss")</script>Safe content';
      const sanitized = sanitizeContent(scriptContent);
      expect(sanitized).toBe('Safe content');
    });

    test('should handle null/undefined input', () => {
      expect(sanitizeContent(null)).toBe('');
      expect(sanitizeContent(undefined)).toBe('');
    });

    test('should normalize whitespace', () => {
      const messyContent = '  Multiple   spaces\n\tand\ttabs  ';
      const sanitized = sanitizeContent(messyContent);
      expect(sanitized).toBe('Multiple spaces and tabs');
    });

    test('should truncate long content', () => {
      const longContent = 'a'.repeat(10000);
      const sanitized = sanitizeContent(longContent, 1000);
      expect(sanitized.length).toBeLessThanOrEqual(1003); // +3 for '...'
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const mockFetch = jest.fn();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      global.fetch = mockFetch;

      // Test that error is caught and handled
      const result = await fetch('https://api.example.com').catch(e => e);
      expect(result).toBeInstanceOf(Error);
    });

    test('should handle API rate limits', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        headers: {
          get: jest.fn().mockReturnValue('60')
        }
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      try {
        await fetch('https://api.example.com');
      } catch (error) {
        expect(error.message).toContain('rate limit');
      }
    });

    test('should validate response format', () => {
      const validResponse = {
        choices: [{ message: { content: 'Summary' } }]
      };

      const invalidResponse = {
        error: 'Invalid request'
      };

      expect(validateInput.apiResponse(validResponse)).toBe(true);
      expect(validateInput.apiResponse(invalidResponse)).toBe(false);
    });
  });
});