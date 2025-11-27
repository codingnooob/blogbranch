# Blog Link Analyzer

> 🚀 **Automated Release Pipeline Status**: ✅ **ACTIVE** - v1.1.3 deployed successfully

A browser extension that detects blog posts and extracts linked blog content with AI-powered summarization capabilities.

## 🌟 Features

- **Blog Detection**: Automatically identifies blog posts on any webpage
- **Link Extraction**: Extracts all blog post links with titles and metadata
- **AI Summarization**: Summarize current page and linked blogs using multiple AI providers
- **Nested Exploration**: Multi-level link exploration with breadcrumb navigation
- **Smart Filtering**: Filter by internal links, extracted content, and search functionality
- **Export Options**: Export link data for further analysis
- **Cross-Browser**: Works on Chrome (Manifest V3) and Firefox (Manifest V2)

## 🌐 Browser Compatibility

- **Chrome**: Manifest V3 compatible
- **Firefox**: Manifest V2 compatible
- **Edge**: Chrome Web Store compatible
- **Safari**: Not currently supported

## 📋 Requirements

### Operating System

- Windows 10+ or macOS 10.15+ or Ubuntu 18.04+

### Development Tools

- **Node.js**: 16.0.0 or higher
- **npm**: 8.0.0 or higher
- **Git**: 2.0.0 or higher (for cloning)

### Build Dependencies

- **webpack**: 5.89.0+ (JavaScript bundling)
- **archiver**: 6.0.1+ (ZIP file creation)
- **web-ext**: 9.1.0+ (Firefox XPI generation)
- **@babel/core**: 7.28.5+ (JavaScript transpilation)
- **@babel/preset-env**: Latest (Browser compatibility)

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/codingnooob/blogbranch.git
cd blogbranch
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Installation

```bash
npm run --help
# Should show all available scripts
```

## 🔧 Build Instructions

### Development Build

```bash
npm run build:dev
```

Creates development bundles with source maps and watches for changes.

### Production Build

```bash
npm run build
```

Creates optimized production bundles in `dist/` directory.

### Create Chrome Extension

```bash
npm run package:chrome
```

Creates `blog-link-analyzer-v1.1.1.zip` ready for Chrome Web Store upload.

### Create Firefox Extension

```bash
npm run package:firefox
```

Creates `blog-link-analyzer-firefox-v1.1.1.zip` ready for Firefox Add-ons upload.

### Create All Package Formats

```bash
npm run package:all-formats
```

Creates all package formats:

- Chrome ZIP: `blog-link-analyzer-v1.1.1.zip`
- Chrome CRX: `blog-link-analyzer-v1.1.1.crx`
- Firefox ZIP: `blog-link-analyzer-firefox-v1.1.1.zip`
- Firefox XPI: `blog-link-analyzer-firefox-v1.1.1.xpi`

## 📁 Project Structure

```
blogbranch/
├── 📄 Core Extension Files
│   ├── manifest.json              # Chrome manifest (V3)
│   ├── manifest-firefox.json       # Firefox manifest (V2)
│   ├── popup.html                 # Main popup interface
│   ├── popup.js, popup.css        # Popup assets
│   ├── ai-service.js              # AI provider abstraction
│   ├── storage-manager.js           # Settings & caching
│   └── content-fetcher.js          # Content extraction
├── 📁 Essential Directories
│   ├── background/                 # Service worker
│   │   └── service-worker.js
│   ├── content/                    # Content scripts
│   │   ├── blog-detector.js      # Blog detection
│   │   ├── link-extractor.js     # Link extraction
│   │   └── content-styles.css     # Content styling
│   ├── scripts/                    # Build & packaging scripts
│   ├── utils/                      # Additional utilities
│   └── icons/                      # Extension icons
├── 📦 Build Artifacts
│   ├── *.zip, *.crx, *.xpi       # Generated packages
│   └── build-firefox/               # Temporary build dir
├── 🔧 Configuration
│   ├── package.json                # Project configuration
│   ├── webpack.config.js            # Build configuration
│   └── .gitignore                  # Git ignore rules
└── 📚 Documentation
    ├── README.md                   # This file
    ├── LICENSE, PRIVACY.md        # Legal documents
    └── *.md                        # Additional docs
```

## 🤖 AI Functionality

### Supported AI Providers

- **OpenAI**: GPT-4, GPT-3.5-turbo, GPT-3.5
- **Anthropic**: Claude-3-sonnet, Claude-3-haiku, Claude-3-opus
- **Ollama**: Local models (llama2, mistral, custom)
- **Custom**: Any OpenAI-compatible API endpoint

### AI Features

- **Current Page Summary**: Summarize the blog post you're currently viewing
- **Link Summaries**: Summarize individual blog posts from extracted links
- **Batch Processing**: Summarize multiple links efficiently
- **Caching**: Intelligent summary caching to reduce API calls
- **Connection Testing**: Verify AI provider connectivity before use
- **Custom Models**: Support for custom model configurations

## 🛠️ Development

### Local Development

```bash
npm run dev
```

Starts development server with hot reloading and watches for file changes.

### Testing

```bash
npm run test
```

Runs the test suite with Jest framework.

### Linting

```bash
npm run lint
```

Checks code quality with ESLint.

### Type Checking

```bash
npm run typecheck
```

Validates TypeScript types (if applicable).

### Validation

```bash
npm run validate
```

Runs linting, type checking, and tests in sequence.

## 📦 Build Process

### Chrome Extension

1. **Bundle Creation**: Webpack bundles popup.js and dependencies
2. **Manifest Processing**: Uses manifest.json (Manifest V3)
3. **File Packaging**: Includes all necessary files in ZIP
4. **Output**: `blog-link-analyzer-v1.1.1.zip`

### Firefox Extension

1. **Structure Build**: Copies files to build-firefox/ directory
2. **Manifest Conversion**: Converts to Manifest V2 format
3. **Utils Organization**: Places AI files in utils/ directory
4. **File Packaging**: Creates ZIP with Firefox-specific structure
5. **XPI Generation**: Uses web-ext to create signed XPI
6. **Output**: `blog-link-analyzer-firefox-v1.1.1.xpi`

### Output Files

- **Chrome ZIP**: `blog-link-analyzer-v1.1.1.zip` (~78KB)
- **Chrome CRX**: `blog-link-analyzer-v1.1.1.crx` (~78KB)
- **Firefox ZIP**: `blog-link-analyzer-firefox-v1.1.1.zip` (~78KB)
- **Firefox XPI**: `blog-link-analyzer-firefox-v1.1.1.xpi` (~78KB)

## 🔧 Configuration

### Environment Variables

- **NODE_ENV**: Set to 'production' for optimized builds
- **EXTENSION_VERSION**: Automatically set from package.json

### Customization

- **AI Providers**: Configure in extension settings
- **API Keys**: Set in extension popup settings
- **Model Selection**: Choose specific models per provider
- **Caching**: Enable/disable summary caching

## 🐛 Troubleshooting

### Common Build Issues

#### Permission Denied

```bash
# Fix: Ensure proper file permissions
chmod +x scripts/*.js
```

#### Missing Dependencies

```bash
# Fix: Clean install
rm -rf node_modules package-lock.json
npm install
```

#### Web-ext Not Found

```bash
# Fix: Install globally
npm install -g web-ext
```

### Firefox-Specific Issues

#### Manifest Validation Errors

- **Content Scripts**: Ensure all files exist in content/ directory
- **Icons**: Verify all icon sizes are present in icons/ directory
- **Permissions**: Check required permissions in manifest-firefox.json

#### XPI Generation Fails

- **Node Version**: Ensure Node.js 16+ is installed
- **Build Directory**: Clean build-firefox/ directory first
- **Web-ext Version**: Update to latest web-ext version

### Chrome-Specific Issues

#### Manifest V3 Errors

- **Service Worker**: Ensure background/service-worker.js exists
- **Action Handlers**: Verify proper action API usage
- **CSP Rules**: Check content security policy compliance

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Run validation: `npm run validate`
5. Commit changes: `git commit -m "Add feature description"`
6. Push branch: `git push origin feature-name`
7. Create pull request

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Trailing Commas**: Required in objects/arrays
- **Line Length**: Maximum 80 characters
- **ESLint**: Follow project ESLint configuration

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **GitHub Repository**: https://github.com/codingnooob/blogbranch
- **Chrome Web Store**: [Link when published]
- **Firefox Add-ons**: [Link when published]
- **Documentation**: https://codingnooob.github.io/blogbranch/
- **Issues**: https://github.com/codingnooob/blogbranch/issues

## 🚀 Current Status

- ✅ **Automated Build System**: Webpack compilation with zero errors
- ✅ **Quality Assurance**: ESLint, TypeScript, Jest testing, and security scanning
- ✅ **Automated Release**: Semantic-release with changelog generation
- ✅ **Store Deployment**: Chrome Web Store and Firefox Add-ons deployment
- ✅ **CI/CD Pipeline**: GitHub Actions with comprehensive testing and deployment
- 🔄 **Store Secrets**: Configured but need verification for production deployment

## 📈 Version History

- **v1.2.9**: Store deployment infrastructure with automated CI/CD pipeline
- **v1.1.1**: Version synchronization across all platforms, bug fixes
- **v1.1.0**: AI summarization functionality, project structure optimization
- **v1.0.2**: Initial release with basic blog detection
- **v1.0.1**: Beta testing release

## 📞 Support

For issues, questions, or contributions:

- **GitHub Issues**: https://github.com/codingnooob/blogbranch/issues
- **Documentation**: See additional .md files in repository
- **Privacy Policy**: See [PRIVACY.md](PRIVACY.md)

---

**Built with ❤️ for the blogging community**
# Test deployment fix
