# Blog Link Analyzer Extension

A Chrome/Firefox extension that detects blog posts and extracts linked blog content with titles and authors, displaying them in an interactive dropdown interface.

## Features

- **Blog Post Detection**: Automatically detects if the current page is a blog post using URL patterns, content analysis, and meta tags
- **Link Extraction**: Finds all hyperlinks in blog posts that lead to other blog posts
- **Metadata Extraction**: Extracts titles and authors from linked blog posts
- **Interactive UI**: Dropdown interface with expandable nested links
- **Cross-Platform Support**: Works on WordPress, Medium, Substack, Ghost, and other blog platforms
- **Cross-Browser Compatibility**: Supports both Chrome and Firefox

## Installation

### Chrome
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `blog-link-analyzer` directory
5. The extension should appear in your toolbar

### Firefox
1. Download or clone this repository
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select the `manifest.json` file from the `blog-link-analyzer` directory
5. The extension should be installed temporarily

## Usage

1. Navigate to a blog post
2. Click the Blog Link Analyzer icon in your browser toolbar
3. The extension will analyze the page and display:
   - Number of blog post links found
   - List of linked posts with titles and authors
   - Confidence scores for each link
   - Expandable nested links (for internal links)
4. Use the search and filter options to find specific posts
5. Click on any post to open it in a new tab

## Architecture

### Components

- **Manifest V3**: Extension configuration and permissions
- **Content Scripts**: Blog detection and link extraction
- **Background Service Worker**: Data processing and storage
- **Popup UI**: User interface with dropdown functionality
- **Utility Modules**: Platform detection, data extraction, error handling

### File Structure
```
blog-link-analyzer/
├── manifest.json                 # Extension manifest
├── background/
│   └── service-worker.js         # Background script
├── content/
│   ├── blog-detector.js         # Blog post detection
│   ├── link-extractor.js        # Link extraction logic
│   └── content-styles.css       # Content script styles
├── popup/
│   ├── popup.html              # Popup interface
│   ├── popup.js                # Popup functionality
│   └── popup.css               # Popup styles
├── utils/
│   ├── platform-detectors.js   # Blog platform detection
│   ├── data-extractors.js      # Title/author extraction
│   ├── browser-compat.js       # Cross-browser compatibility
│   └── error-handling.js       # Error handling utilities
└── icons/
    ├── icon16.png              # 16x16 icon
    ├── icon48.png              # 48x48 icon
    └── icon128.png             # 128x128 icon
```

## Supported Blog Platforms

- **WordPress**: Detects WordPress URLs and structured data
- **Medium**: Handles Medium publications and author data
- **Substack**: Supports newsletter-style blogs
- **Ghost**: Works with Ghost-powered blogs
- **Custom Blogs**: Uses generic detection for other platforms

## Testing

### Test URLs
The extension has been tested on various blog platforms:

1. **WordPress Blogs**
   - URL patterns: `/blog/post-name/`, `/2024/01/post-title/`
   - Meta tags: `article:published_time`, `author`

2. **Medium Publications**
   - URL patterns: `medium.com/@author/post-title`
   - Structured data: JSON-LD format

3. **Substack Newsletters**
   - URL patterns: `substack.com/p/post-title`
   - Author extraction from newsletter data

### Manual Testing
1. Install the extension in your browser
2. Visit blog posts from different platforms
3. Verify:
   - Blog detection works correctly
   - Links are extracted properly
   - Titles and authors are displayed
   - Nested links expand correctly
   - Search and filter functions work

### Debug Mode
Enable console logging to see detailed information:
- Blog detection results
- Link extraction process
- Error messages and warnings

## Development

### Building from Source
1. Clone the repository
2. Modify source files as needed
3. Test changes by reloading the extension
4. For Chrome: Go to `chrome://extensions/` and click the reload button
5. For Firefox: Go to `about:debugging` and reload the temporary add-on

### Code Style
- Use 2 spaces for indentation
- Follow ES6+ standards
- Include JSDoc comments for functions
- Handle errors gracefully
- Test cross-browser compatibility

## Permissions

The extension requests the following permissions:

- `activeTab`: Access to the currently active tab
- `storage`: Local storage for caching data
- `scripting`: Inject content scripts dynamically
- `<all_urls>`: Access to all websites for blog detection

## Privacy

- No data is sent to external servers
- All processing happens locally in the browser
- Temporary tabs are created and closed automatically for nested link analysis
- No personal information is collected or stored

## Troubleshooting

### Common Issues

1. **Extension not loading**
   - Check manifest syntax
   - Verify all files are present
   - Check browser console for errors

2. **Blog not detected**
   - Verify the page is actually a blog post
   - Check URL patterns match
   - Look for required meta tags

3. **No links found**
   - Ensure the blog post contains links to other posts
   - Check if links are in navigation areas (excluded)
   - Verify confidence threshold isn't too high

4. **Nested links not working**
   - Check if linked pages are accessible
   - Verify cross-origin permissions
   - Look for console errors

### Debug Information
Enable debug mode by opening the browser console and looking for:
- `Blog Link Analyzer:` prefixed messages
- Error details and stack traces
- Performance metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on multiple platforms
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Changelog

### v1.0.0
- Initial release
- Blog post detection
- Link extraction and analysis
- Popup interface with dropdown
- Nested link expansion
- Cross-browser support
- Error handling and validation