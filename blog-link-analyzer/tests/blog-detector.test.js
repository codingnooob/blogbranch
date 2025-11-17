const { detectBlogPost } = require('../content/blog-detector.js');

describe('Blog Detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.chrome = {
      runtime: { sendMessage: jest.fn() }
    };
  });

  test('should detect WordPress blog post', () => {
    // Mock WordPress URL
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/2024/01/sample-blog-post/' },
      writable: true
    });

    // Mock WordPress meta tags
    const metaTags = [
      { name: 'article:published_time', content: '2024-01-15T10:00:00Z' },
      { name: 'author', content: 'John Doe' }
    ];
    
    metaTags.forEach(tag => {
      const meta = document.createElement('meta');
      Object.assign(meta, tag);
      document.head.appendChild(meta);
    });

    const result = detectBlogPost();
    
    expect(result.isBlog).toBe(true);
    expect(result.platform).toBe('wordpress');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('should detect Medium article', () => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://medium.com/@author/article-title' },
      writable: true
    });

    const result = detectBlogPost();
    
    expect(result.isBlog).toBe(true);
    expect(result.platform).toBe('medium');
  });

  test('should detect Substack newsletter', () => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://newsletter.substack.com/p/article-title' },
      writable: true
    });

    const result = detectBlogPost();
    
    expect(result.isBlog).toBe(true);
    expect(result.platform).toBe('substack');
  });

  test('should not detect non-blog pages', () => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/homepage' },
      writable: true
    });

    const result = detectBlogPost();
    
    expect(result.isBlog).toBe(false);
    expect(result.confidence).toBeLessThan(0.3);
  });

  test('should extract blog metadata', () => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/blog/test-post' },
      writable: true
    });

    // Add structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Test Blog Post',
      author: { name: 'Jane Smith' },
      datePublished: '2024-01-15'
    });
    document.head.appendChild(script);

    const result = detectBlogPost();
    
    expect(result.metadata.title).toBe('Test Blog Post');
    expect(result.metadata.author).toBe('Jane Smith');
  });
});