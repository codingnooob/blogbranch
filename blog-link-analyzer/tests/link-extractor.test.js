const { extractBlogLinks } = require('../content/link-extractor.js');

describe('Link Extraction', () => {
  beforeEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('should extract blog post links from content', () => {
    // Create mock blog content
    const article = document.createElement('article');
    
    const paragraph = document.createElement('p');
    paragraph.appendChild(document.createTextNode('Check out this '));
    
    const link1 = document.createElement('a');
    link1.href = 'https://example.com/blog/post1';
    link1.textContent = 'great post';
    paragraph.appendChild(link1);
    
    paragraph.appendChild(document.createTextNode(' and this '));
    
    const link2 = document.createElement('a');
    link2.href = 'https://medium.com/@author/story';
    link2.textContent = 'Medium story';
    paragraph.appendChild(link2);
    
    paragraph.appendChild(document.createTextNode('.'));
    article.appendChild(paragraph);
    
    const nav = document.createElement('nav');
    
    const homeLink = document.createElement('a');
    homeLink.href = '/home';
    homeLink.textContent = 'Home';
    nav.appendChild(homeLink);
    
    const aboutLink = document.createElement('a');
    aboutLink.href = '/about';
    aboutLink.textContent = 'About';
    nav.appendChild(aboutLink);
    
    article.appendChild(nav);
    document.body.appendChild(article);

    const links = extractBlogLinks();
    
    expect(links).toHaveLength(2);
    expect(links[0].url).toBe('https://example.com/blog/post1');
    expect(links[1].url).toBe('https://medium.com/@author/story');
  });

  test('should filter out navigation links', () => {
    // Clear previous content
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    
    const header = document.createElement('header');
    const nav = document.createElement('nav');
    
    const homeLink = document.createElement('a');
    homeLink.href = '/home';
    homeLink.textContent = 'Home';
    nav.appendChild(homeLink);
    
    const blogLink = document.createElement('a');
    blogLink.href = '/blog';
    blogLink.textContent = 'Blog';
    nav.appendChild(blogLink);
    
    header.appendChild(nav);
    
    const main = document.createElement('main');
    const article = document.createElement('article');
    
    const paragraph = document.createElement('p');
    paragraph.appendChild(document.createTextNode('Read this '));
    
    const postLink = document.createElement('a');
    postLink.href = 'https://example.com/blog/post';
    postLink.textContent = 'blog post';
    paragraph.appendChild(postLink);
    
    article.appendChild(paragraph);
    main.appendChild(article);
    
    const footer = document.createElement('footer');
    const contactLink = document.createElement('a');
    contactLink.href = '/contact';
    contactLink.textContent = 'Contact';
    footer.appendChild(contactLink);
    
    document.body.appendChild(header);
    document.body.appendChild(main);
    document.body.appendChild(footer);

    const links = extractBlogLinks();
    
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe('https://example.com/blog/post');
  });

  test('should extract link metadata', () => {
    // Clear previous content
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    
    const article = document.createElement('article');
    
    const link = document.createElement('a');
    link.href = 'https://example.com/blog/post';
    link.title = 'Amazing Post';
    link.textContent = 'Link';
    
    article.appendChild(link);
    document.body.appendChild(article);

    const links = extractBlogLinks();
    
    expect(links[0].title).toBe('Amazing Post');
    expect(links[0].confidence).toBeGreaterThan(0);
  });

  test('should handle duplicate links', () => {
    // Clear previous content
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    
    const article = document.createElement('article');
    
    const link1 = document.createElement('a');
    link1.href = 'https://example.com/blog/post';
    link1.textContent = 'First link';
    article.appendChild(link1);
    
    const link2 = document.createElement('a');
    link2.href = 'https://example.com/blog/post';
    link2.textContent = 'Second link';
    article.appendChild(link2);
    
    document.body.appendChild(article);

    const links = extractBlogLinks();
    
    expect(links).toHaveLength(1);
  });

  test('should calculate confidence scores', () => {
    // Clear previous content
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    
    const article = document.createElement('article');
    
    const wordpressLink = document.createElement('a');
    wordpressLink.href = 'https://myblog.wordpress.com/2024/01/sample-post';
    wordpressLink.textContent = 'WordPress';
    article.appendChild(wordpressLink);
    
    const mediumLink = document.createElement('a');
    mediumLink.href = 'https://medium.com/@user/story-title';
    mediumLink.textContent = 'Medium';
    article.appendChild(mediumLink);
    
    const randomLink = document.createElement('a');
    randomLink.href = 'https://random.com/blog/post';
    randomLink.textContent = 'Random';
    article.appendChild(randomLink);
    
    document.body.appendChild(article);

    const links = extractBlogLinks();
    
    const foundWordpressLink = links.find(l => l.url.includes('wordpress.com'));
    const foundMediumLink = links.find(l => l.url.includes('medium.com'));
    const foundRandomLink = links.find(l => l.url.includes('random.com'));
    
    expect(foundWordpressLink.confidence).toBeGreaterThanOrEqual(foundMediumLink.confidence);
    expect(foundMediumLink.confidence).toBeGreaterThanOrEqual(foundRandomLink.confidence);
  });
});