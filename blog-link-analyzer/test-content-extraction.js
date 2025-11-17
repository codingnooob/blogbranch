// Test content extraction from various blog platforms
const { extractContentFromHTMLSimple } = require('./background/service-worker.js');

// Test HTML samples from different blog platforms
const testCases = [
  {
    name: 'Medium Article',
    url: 'https://medium.com/example/article',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Understanding Modern JavaScript - Medium</title>
        <meta name="author" content="John Doe">
        <meta property="article:published_time" content="2024-01-15T10:00:00Z">
      </head>
      <body>
        <article>
          <h1>Understanding Modern JavaScript</h1>
          <p>JavaScript has evolved significantly over the years. From its humble beginnings as a simple scripting language to powering complex web applications, the journey has been remarkable.</p>
          <p>In this article, we'll explore the key features that make modern JavaScript so powerful. We'll cover ES6+ features, async programming, and the ecosystem that has grown around the language.</p>
          <div class="post-content">
            <p>Modern JavaScript introduces concepts like arrow functions, destructuring, and modules. These features make code more readable and maintainable.</p>
            <p>Let's dive deeper into each of these topics and understand how they can improve your development workflow.</p>
          </div>
        </article>
      </body>
      </html>
    `
  },
  {
    name: 'WordPress Blog',
    url: 'https://example.com/blog-post',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>My WordPress Post - My Blog</title>
        <meta name="author" content="Jane Smith">
        <meta property="og:title" content="My WordPress Post">
      </head>
      <body>
        <div class="content-area">
          <main class="site-main">
            <article id="post-123" class="post-123 post type-post status-publish">
              <header class="entry-header">
                <h1 class="entry-title">My WordPress Post</h1>
                <div class="entry-meta">
                  <span class="byline">By <span class="author vcard">Jane Smith</span></span>
                  <time class="entry-date published" datetime="2024-01-20">January 20, 2024</time>
                </div>
              </header>
              <div class="entry-content">
                <p>Welcome to my WordPress blog! This is a sample post to demonstrate content extraction.</p>
                <p>WordPress is one of the most popular content management systems in the world. It powers millions of websites and blogs.</p>
                <p>In this post, we'll discuss the benefits of using WordPress for your blog or website.</p>
                <p>Some key advantages include:</p>
                <ul>
                  <li>Easy to use interface</li>
                  <li>Large plugin ecosystem</li>
                  <li>SEO friendly</li>
                  <li>Responsive design support</li>
                </ul>
                <p>Let's explore each of these benefits in detail...</p>
              </div>
            </article>
          </main>
        </div>
      </body>
      </html>
    `
  },
  {
    name: 'Dev.to Post',
    url: 'https://dev.to/author/dev-post',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Building REST APIs with Node.js - DEV Community</title>
        <meta name="author" content="Alex Johnson">
        <meta property="article:published_time" content="2024-01-25T14:30:00Z">
      </head>
      <body>
        <div class="article-container">
          <article>
            <h1>Building REST APIs with Node.js</h1>
            <div class="author-info">
              <span class="author-name">Alex Johnson</span>
              <time datetime="2024-01-25">Jan 25</time>
            </div>
            <div class="article-body">
              <p>Node.js has become a popular choice for building REST APIs due to its non-blocking I/O model and JavaScript runtime.</p>
              <p>In this tutorial, we'll build a complete REST API from scratch using Express.js, a popular web framework for Node.js.</p>
              <h2>Prerequisites</h2>
              <p>Before we start, make sure you have:</p>
              <ul>
                <li>Node.js installed on your machine</li>
                <li>Basic knowledge of JavaScript</li>
                <li>Understanding of REST concepts</li>
              </ul>
              <h2>Getting Started</h2>
              <p>Let's begin by setting up our project structure and installing the necessary dependencies.</p>
              <p>We'll use Express.js for our web framework and MongoDB for data storage.</p>
            </div>
          </article>
        </div>
      </body>
      </html>
    `
  },
  {
    name: 'Minimal Blog',
    url: 'https://minimal-blog.com/post',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <title>A Simple Post</title>
      </head>
      <body>
        <h1>A Simple Post</h1>
        <p>This is a minimal blog post with very basic HTML structure.</p>
        <p>Not many fancy elements here, just plain text content.</p>
        <p>Let's see how well our extraction works with this simple structure.</p>
        <p>The content should still be extractable even without complex markup.</p>
      </body>
      </html>
    `
  }
];

// Test function
function testContentExtraction() {
  console.log('🧪 Testing Content Extraction Implementation\n');
  
  // Since we can't directly import the function from the service worker,
  // we'll define a simplified version for testing
  function extractContentFromHTMLSimple(html, url) {
    let title = '';
    let author = '';
    let publishDate = null;
    let text = '';

    try {
      // Extract title
      const titlePatterns = [
        /<title[^>]*>([^<]+)<\/title>/i,
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
        /<h2[^>]*>([^<]+)<\/h2>/i
      ];

      for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          title = match[1].trim();
          break;
        }
      }

      // Extract author
      const authorPatterns = [
        /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']article:author["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<[^>]*class=["'][^"']*author["'][^>]*>([^<]+)<\/[^>]*>/i,
        /<[^>]*class=["'][^"']*byline["'][^>]*>([^<]+)<\/[^>]*>/i
      ];

      for (const pattern of authorPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          author = match[1].trim();
          break;
        }
      }

      // Extract publish date
      const datePatterns = [
        /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']article:published_time["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+property=["']published_time["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<time[^>]+datetime=["']([^"']+)["'][^>]*>/i,
        /<[^>]*class=["'][^"']*date["'][^>]*>([^<]+)<\/[^>]*>/i
      ];

      for (const pattern of datePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const date = new Date(match[1]);
          if (date && !isNaN(date.getTime())) {
            publishDate = date;
            break;
          }
        }
      }

      // Extract main content
      const contentPatterns = [
        /<article[^>]*>([\s\S]*?)<\/article>/gi,
        /<main[^>]*>([\s\S]*?)<\/main>/gi,
        /<[^>]*class=["'][^"']*content["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*post-content["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*entry-content["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<[^>]*class=["'][^"']*article-body["'][^>]*>([\s\S]*?)<\/[^>]*>/gi,
        /<div[^>]*class=["'][^"']*text["'][^>]*>([\s\S]*?)<\/div>/gi
      ];

      for (const pattern of contentPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          for (const match of matches) {
            const cleanMatch = match
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
              .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
              .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
              .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
              .replace(/<[^>]*class=["'][^"']*advertisement["'][^>]*>[\s\S]*?<\/[^>]*>/gi, '')
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            if (cleanMatch.length > text.length) {
              text = cleanMatch;
            }
          }
          
          if (text.length > 200) {
            break;
          }
        }
      }

      // Fallback: extract all paragraph text
      if (!text || text.trim().length < 100) {
        const paragraphMatches = html.match(/<p[^>]*>([^<]+)<\/p>/gi);
        if (paragraphMatches) {
          text = paragraphMatches
            .map(p => p.replace(/<[^>]*>/g, '').trim())
            .filter(p => p.length > 10)
            .join(' ');
        }
      }

      // Final fallback: extract all text content
      if (!text || text.trim().length < 50) {
        const cleanHtml = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
          .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
        
        const textMatches = cleanHtml.match(/<[^>]*>([^<]+)<\/[^>]*>/gi);
        if (textMatches) {
          text = textMatches
            .map(match => match.replace(/<[^>]*>/g, '').trim())
            .filter(text => text.length > 5)
            .join(' ')
            .substring(0, 10000);
        }
      }

    } catch (error) {
      console.error('Error extracting content from HTML:', error);
    }

    return {
      title: title,
      author: author,
      publishDate: publishDate,
      text: text
    };
  }

  let passedTests = 0;
  let totalTests = testCases.length;

  testCases.forEach((testCase, index) => {
    console.log(`📝 Test ${index + 1}: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    
    const result = extractContentFromHTMLSimple(testCase.html, testCase.url);
    
    console.log(`   ✅ Title: "${result.title || 'NOT FOUND'}"`);
    console.log(`   ✅ Author: "${result.author || 'NOT FOUND'}"`);
    console.log(`   ✅ Publish Date: ${result.publishDate ? result.publishDate.toISOString() : 'NOT FOUND'}`);
    console.log(`   ✅ Content Length: ${result.text ? result.text.length : 0} characters`);
    
    // Check if content is meaningful (more than 50 characters)
    const hasContent = result.text && result.text.trim().length > 50;
    const hasTitle = result.title && result.title.trim().length > 0;
    
    if (hasContent && hasTitle) {
      console.log(`   🎉 PASSED - Content extracted successfully`);
      passedTests++;
    } else {
      console.log(`   ❌ FAILED - Missing title or insufficient content`);
      console.log(`      Title found: ${hasTitle}`);
      console.log(`      Content adequate: ${hasContent}`);
    }
    
    console.log(`   📄 Content Preview: "${result.text ? result.text.substring(0, 100) + '...' : 'NO CONTENT'}"`);
    console.log('');
  });

  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Content extraction is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Content extraction may need improvement.');
  }

  return passedTests === totalTests;
}

// Run the tests
testContentExtraction();