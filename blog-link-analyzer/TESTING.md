# Test Cases for Blog Link Analyzer Extension

## Test Scenarios

### 1. Blog Detection Tests

#### Test Case 1.1: WordPress Blog Post
- **URL**: `https://example.com/blog/my-awesome-post/`
- **Expected**: Blog detected with high confidence
- **Platform**: WordPress
- **Meta Tags**: `article:published_time`, `author`

#### Test Case 1.2: Medium Article
- **URL**: `https://medium.com/@author/article-title`
- **Expected**: Blog detected with medium confidence
- **Platform**: Medium
- **Structured Data**: JSON-LD format

#### Test Case 1.3: Substack Newsletter
- **URL**: `https://author.substack.com/p/newsletter-title`
- **Expected**: Blog detected with high confidence
- **Platform**: Substack
- **Author Data**: From newsletter metadata

#### Test Case 1.4: Regular Website (Not Blog)
- **URL**: `https://example.com/about-us`
- **Expected**: Not detected as blog
- **Confidence**: < 0.5

#### Test Case 1.5: E-commerce Product Page
- **URL**: `https://shop.example.com/product/item`
- **Expected**: Not detected as blog
- **Content**: Product descriptions, not blog content

### 2. Link Extraction Tests

#### Test Case 2.1: Internal Blog Links
- **Scenario**: Blog post with links to other posts on same domain
- **Expected**: Links extracted and marked as internal
- **Confidence**: High (> 0.7)

#### Test Case 2.2: External Blog Links
- **Scenario**: Links to blog posts on other domains
- **Expected**: Links extracted and marked as external
- **Metadata**: Limited (title from link text)

#### Test Case 2.3: Navigation Links
- **Scenario**: Links in navigation menu, sidebar, footer
- **Expected**: Excluded from results
- **Reason**: Not part of blog content

#### Test Case 2.4: Mixed Content Links
- **Scenario**: Mix of blog links and other links (images, downloads)
- **Expected**: Only blog post links included
- **Filtering**: Based on URL patterns and confidence

### 3. Metadata Extraction Tests

#### Test Case 3.1: Title Extraction
- **Sources**: JSON-LD, OpenGraph, title tag, h1
- **Priority**: JSON-LD > OpenGraph > title > h1
- **Fallback**: URL slug parsing

#### Test Case 3.2: Author Extraction
- **Sources**: JSON-LD, meta tags, author classes
- **Priority**: Structured data > meta tags > CSS selectors
- **Fallback**: Domain analysis

#### Test Case 3.3: Date Extraction
- **Sources**: JSON-LD, meta tags, time elements
- **Format**: ISO 8601 parsing
- **Validation**: Date object creation

### 4. UI/UX Tests

#### Test Case 4.1: Popup Display
- **Loading**: Shows loading spinner during analysis
- **Results**: Displays link count and list
- **Empty State**: Shows "no results" message
- **Error State**: Shows error message with retry

#### Test Case 4.2: Search and Filter
- **Search**: Filters by title and author text
- **Internal Only**: Shows only internal links
- **Metadata Only**: Shows only links with extracted data
- **Combined**: Multiple filters work together

#### Test Case 4.3: Link Interaction
- **Click**: Opens link in new tab
- **Expand**: Shows nested links for internal posts
- **Hover**: Shows tooltips and metadata
- **Keyboard**: Escape closes popup, Ctrl+R refreshes

### 5. Nested Link Tests

#### Test Case 5.1: Internal Nested Links
- **Scenario**: Clicking expand on internal blog post
- **Expected**: Creates temporary tab, extracts links, closes tab
- **Performance**: Completes within 5 seconds
- **Limit**: Maximum 10 nested links shown

#### Test Case 5.2: External Nested Links
- **Scenario**: Trying to expand external blog post
- **Expected**: Expand button not shown
- **Reason**: Cannot access external content due to CORS

#### Test Case 5.3: Nested Link Errors
- **Scenario**: Error during nested link extraction
- **Expected**: Shows error message in nested container
- **Recovery**: User can retry or close

### 6. Cross-Browser Tests

#### Test Case 6.1: Chrome Compatibility
- **Version**: Chrome 88+
- **Manifest**: V3 support
- **APIs**: chrome.* APIs work correctly
- **Performance**: No memory leaks

#### Test Case 6.2: Firefox Compatibility
- **Version**: Firefox 78+
- **Manifest**: V2/V3 compatibility
- **APIs**: browser.* APIs work correctly
- **Styling**: Popup renders correctly

### 7. Error Handling Tests

#### Test Case 7.1: Network Errors
- **Scenario**: No internet connection
- **Expected**: Graceful degradation, cached data if available
- **Message**: User-friendly error notification

#### Test Case 7.2: Parse Errors
- **Scenario**: Malformed HTML or JSON
- **Expected**: Error logged, extension continues working
- **Recovery**: Skip problematic content

#### Test Case 7.3: Permission Errors
- **Scenario**: Missing permissions for some sites
- **Expected**: Clear error message, instructions to fix
- **Fallback**: Limited functionality

### 8. Performance Tests

#### Test Case 8.1: Large Pages
- **Scenario**: Blog post with 100+ links
- **Expected**: Analysis completes within 3 seconds
- **UI**: Responsive during processing
- **Memory**: Usage stays reasonable

#### Test Case 8.2: Complex DOM
- **Scenario**: Heavily nested HTML structure
- **Expected**: Efficient DOM queries
- **Performance**: No layout thrashing
- **Accuracy**: Still finds relevant links

#### Test Case 8.3: Memory Usage
- **Scenario**: Multiple tabs with extension active
- **Expected**: Memory usage scales linearly
- **Cleanup**: Old data removed periodically
- **Leaks**: No memory leaks detected

## Test Data

### Sample Blog Posts for Testing
1. **WordPress**: `https://wordpress.org/news/2024/01/wordpress-6-4/`
2. **Medium**: `https://medium.com/@medium/what-were-reading-this-week-c8d8ef5d6a1a`
3. **Substack**: `https://stratechery.com/2024/apple-vision-pro/`
4. **Ghost**: `https://ghost.org/blog/the-ghost-story/`

### Edge Cases
- Single-page applications
- Infinite scroll blogs
- Password-protected posts
- Local development environments
- Non-standard URL structures

## Automated Testing

### Unit Tests
- Blog detection algorithms
- Link extraction logic
- Metadata parsing
- Validation functions

### Integration Tests
- Content script injection
- Message passing
- Storage operations
- Popup interactions

### End-to-End Tests
- Complete user workflows
- Cross-browser scenarios
- Performance benchmarks
- Error recovery

## Test Results Documentation

### Results Template
```
Test Case: [ID]
Date: [Date]
Browser: [Browser + Version]
URL: [Test URL]
Expected: [Expected Result]
Actual: [Actual Result]
Status: [Pass/Fail]
Notes: [Additional Information]
```

### Bug Reporting
- Include test case ID
- Provide browser and version
- Share console errors
- Attach screenshots if relevant
- Describe steps to reproduce

## Continuous Testing

### Automated Checks
- Linting and code quality
- Manifest validation
- Icon and asset optimization
- Bundle size analysis

### Manual Testing
- Weekly platform testing
- New browser version testing
- User feedback integration
- Performance monitoring