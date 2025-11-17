const { extractBlogLinks } = require('../content/link-extractor.js');

describe('Link Extraction', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('should extract blog post links from content', () => {
    // Create mock blog content
    document.body.innerHTML = `
      <article>
        <p>Check out this <a href="https://example.com/blog/post1">great post</a> 
        and this <a href="https://medium.com/@author/story">Medium story</a>.</p>
        <nav>
          <a href="/home">Home</a>
          <a href="/about">About</a>
        </nav>
      </article>
    `;

    const links = extractBlogLinks();
    
    expect(links).toHaveLength(2);
    expect(links[0].url).toBe('https://example.com/blog/post1');
    expect(links[1].url).toBe('https://medium.com/@author/story');
  });

  test('should filter out navigation links', () => {
    document.body.innerHTML = `
      <header>
        <nav>
          <a href="/home">Home</a>
          <a href="/blog">Blog</a>
        </nav>
      </header>
      <main>
        <article>
          <p>Read this <a href="https://example.com/blog/post">blog post</a></p>
        </article>
      </main>
      <footer>
        <a href="/contact">Contact</a>
      </footer>
    `;

    const links = extractBlogLinks();
    
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe('https://example.com/blog/post');
  });

  test('should extract link metadata', () => {
    document.body.innerHTML = `
      <article>
        <a href="https://example.com/blog/post" title="Amazing Post">Link</a>
      </article>
    `;

    const links = extractBlogLinks();
    
    expect(links[0].title).toBe('Amazing Post');
    expect(links[0].confidence).toBeGreaterThan(0);
  });

  test('should handle duplicate links', () => {
    document.body.innerHTML = `
      <article>
        <a href="https://example.com/blog/post">First link</a>
        <a href="https://example.com/blog/post">Second link</a>
      </article>
    `;

    const links = extractBlogLinks();
    
    expect(links).toHaveLength(1);
  });

  test('should calculate confidence scores', () => {
    document.body.innerHTML = `
      <article>
        <a href="https://wordpress.com/post">WordPress</a>
        <a href="https://medium.com/@user/story">Medium</a>
        <a href="https://random.com/page">Random</a>
      </article>
    `;

    const links = extractBlogLinks();
    
    const wordpressLink = links.find(l => l.url.includes('wordpress.com'));
    const mediumLink = links.find(l => l.url.includes('medium.com'));
    const randomLink = links.find(l => l.url.includes('random.com'));
    
    expect(wordpressLink.confidence).toBeGreaterThan(mediumLink.confidence);
    expect(mediumLink.confidence).toBeGreaterThan(randomLink.confidence);
  });
});