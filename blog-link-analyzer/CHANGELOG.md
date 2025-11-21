# Changelog

## [1.0.2] - 2025-11-21

### 🐛 Bug Fixes
- **Firefox Compatibility**: Fixed `HTMLAnchorElement object could not be cloned` error in Firefox
- **DOM Element Cloning**: Removed DOM element references from message payloads to prevent serialization issues
- **Cross-Browser Consistency**: Ensured extension works reliably across Chrome and Firefox

### 🔧 Technical Changes
- **link-extractor.js**: Replaced `element: link` with `elementSelector: CSS selector` and `tagName: string`
- **blog-detector.js**: Replaced `mainContentElement: DOM element` with `mainContentSelector: CSS selector`
- **Message Passing**: All data sent via `chrome.runtime.sendMessage` is now JSON-serializable
- **Element Identification**: Updated link extraction to use CSS selectors instead of DOM references

### ✅ Improvements
- **Performance**: Smaller message payloads, no DOM serialization overhead
- **Security**: Follows best practices for extension message passing
- **Reliability**: Eliminates extension failures on Firefox browser
- **Maintainability**: Cleaner separation between DOM operations and data serialization

### 🧪 Testing
- All unit tests pass (link-extractor, blog-detector)
- Build process completes successfully
- DOM element removal verified through code analysis
- No breaking changes to existing functionality

---

## [1.0.1] - Previous Release
- Initial Firefox extension release
- Blog post detection and link extraction functionality
- AI summarization features

## [1.0.0] - Initial Release
- Chrome extension release
- Core blog detection and link extraction
- Popup interface and content analysis