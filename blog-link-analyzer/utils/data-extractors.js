// Title extraction strategies in priority order
const TITLE_SELECTORS = [
  // Structured data (JSON-LD)
  'script[type="application/ld+json"]',
  // OpenGraph meta tags
  'meta[property="og:title"]',
  'meta[name="og:title"]',
  // Standard HTML title
  'title',
  // Article headings
  'article h1',
  'article .title',
  'article .post-title',
  'article .entry-title',
  'h1',
  'h2',
  // Common title class names
  '[class*="title"]',
  '[class*="headline"]',
  '[class*="post-title"]'
];

// Author extraction strategies in priority order
const AUTHOR_SELECTORS = [
  // Structured data (JSON-LD)
  'script[type="application/ld+json"]',
  // Meta tags
  'meta[name="author"]',
  'meta[property="article:author"]',
  'meta[name="article:author"]',
  // Common author selectors
  '[class*="author"]',
  '[class*="by-author"]',
  '[class*="byline"]',
  '[rel="author"]',
  '.author-name',
  '.post-author',
  '.entry-author'
];

// Extract title from page
function extractTitle(document) {
  // Try JSON-LD first
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent);
      if (data.headline) return data.headline;
      if (data.name) return data.name;
    } catch (e) {
      continue;
    }
  }

  // Try OpenGraph meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]') ||
                  document.querySelector('meta[name="og:title"]');
  if (ogTitle && ogTitle.content) {
    return ogTitle.content.trim();
  }

  // Try HTML title
  const title = document.querySelector('title');
  if (title && title.textContent) {
    return title.textContent.trim();
  }

  // Try article headings
  const articleTitle = document.querySelector('article h1') ||
                       document.querySelector('article .title') ||
                       document.querySelector('article .post-title') ||
                       document.querySelector('article .entry-title');
  if (articleTitle && articleTitle.textContent) {
    return articleTitle.textContent.trim();
  }

  // Try h1 or h2
  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent) {
    return h1.textContent.trim();
  }

  const h2 = document.querySelector('h2');
  if (h2 && h2.textContent) {
    return h2.textContent.trim();
  }

  // Try common title classes
  const titleElement = document.querySelector('[class*="title"]') ||
                       document.querySelector('[class*="headline"]') ||
                       document.querySelector('[class*="post-title"]');
  if (titleElement && titleElement.textContent) {
    return titleElement.textContent.trim();
  }

  return null;
}

// Extract author from page
function extractAuthor(document) {
  // Try JSON-LD first
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent);
      if (data.author) {
        if (typeof data.author === 'string') return data.author;
        if (data.author.name) return data.author.name;
      }
    } catch (e) {
      continue;
    }
  }

  // Try meta tags
  const authorMeta = document.querySelector('meta[name="author"]') ||
                     document.querySelector('meta[property="article:author"]') ||
                     document.querySelector('meta[name="article:author"]');
  if (authorMeta && authorMeta.content) {
    return authorMeta.content.trim();
  }

  // Try common author selectors
  const authorElement = document.querySelector('[class*="author"]') ||
                        document.querySelector('[class*="by-author"]') ||
                        document.querySelector('[class*="byline"]') ||
                        document.querySelector('[rel="author"]') ||
                        document.querySelector('.author-name') ||
                        document.querySelector('.post-author') ||
                        document.querySelector('.entry-author');
  if (authorElement && authorElement.textContent) {
    return authorElement.textContent.trim();
  }

  return null;
}

// Extract publication date
function extractDate(document) {
  // Try JSON-LD first
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent);
      if (data.datePublished) return new Date(data.datePublished);
      if (data.dateCreated) return new Date(data.dateCreated);
      if (data.publishDate) return new Date(data.publishDate);
    } catch (e) {
      continue;
    }
  }

  // Try meta tags
  const dateMeta = document.querySelector('meta[property="article:published_time"]') ||
                   document.querySelector('meta[name="article:published_time"]') ||
                   document.querySelector('meta[property="datePublished"]') ||
                   document.querySelector('meta[name="datePublished"]');
  if (dateMeta && dateMeta.content) {
    return new Date(dateMeta.content);
  }

  // Try time elements
  const timeElement = document.querySelector('time[datetime]');
  if (timeElement && timeElement.getAttribute('datetime')) {
    return new Date(timeElement.getAttribute('datetime'));
  }

  return null;
}

// Extract all metadata for a page
function extractPageMetadata(document) {
  return {
    title: extractTitle(document),
    author: extractAuthor(document),
    date: extractDate(document),
    url: document.location.href,
    timestamp: Date.now()
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractTitle,
    extractAuthor,
    extractDate,
    extractPageMetadata,
    TITLE_SELECTORS,
    AUTHOR_SELECTORS
  };
}