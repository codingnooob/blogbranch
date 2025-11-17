# Blog Link Analyzer - Firefox Extension Source Code

This repository contains the complete source code for the Blog Link Analyzer Firefox extension, designed to detect blog posts and extract linked blog content with titles and authors.

## Build Requirements

### Operating System
- **Windows**: Windows 10 or later
- **macOS**: macOS 10.14 (Mojave) or later  
- **Linux**: Any modern distribution (Ubuntu 18.04+, Fedora 30+, Debian 10+)

### Required Software

#### Node.js and npm
- **Node.js**: Version 16.0.0 or later
- **npm**: Version 8.0.0 or later

Installation:
```bash
# Install Node.js using official installer
# Visit https://nodejs.org/ and download the LTS version

# Or using package manager (Ubuntu/Debian)
sudo apt update
sudo apt install nodejs npm

# Verify installation
node --version  # Should be v16.0.0+
npm --version   # Should be v8.0.0+
```

#### Additional Build Tools
- **Git**: For cloning the repository
- **Zip utility**: For creating extension packages

## Step-by-Step Build Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/codingnooob/blogbranch.git
cd blogbranch
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Extension
```bash
# Development build (unminified)
npm run build:dev

# Production build (minified) - for distribution
npm run build

# Firefox-specific build
npm run build:firefox
```

### 4. Package for Firefox
```bash
# Create Firefox extension package
npm run package:firefox

# This creates: blog-link-analyzer-firefox-v1.0.0.zip
```

### 5. Manual Build (Alternative)
If the automated build fails, you can manually create the extension:

```bash
# Create build directory
mkdir -p build

# Copy all source files
cp manifest.json build/
cp -r icons build/
cp -r background build/
cp -r content build/
cp -r popup build/
cp -r utils build/
cp LICENSE build/
cp PRIVACY.md build/

# Create zip file
cd build
zip -r ../blog-link-analyzer-firefox-v1.0.0.zip .
cd ..
```

## File Structure

The extension follows the standard Firefox extension structure:

```
blog-link-analyzer/
├── manifest.json              # Extension manifest
├── background/                # Background scripts
│   └── service-worker.js     # Service worker for background processing
├── content/                   # Content scripts
│   ├── blog-detector.js       # Blog detection logic
│   ├── link-extractor.js     # Link extraction functionality
│   └── content-styles.css     # Styles for injected content
├── popup/                     # Popup interface
│   ├── popup.html             # Popup HTML structure
│   ├── popup.css              # Popup styles
│   └── popup.js              # Popup functionality
├── utils/                     # Utility modules
│   ├── ai-service.js          # AI summarization service
│   ├── error-handling.js      # Error handling utilities
│   ├── storage-manager.js     # Storage management
│   └── [other utilities]     # Additional helper modules
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon64.png
│   ├── icon128.png
│   └── icon256.png
├── LICENSE                    # MIT License
└── PRIVACY.md                # Privacy policy
```

## Third-Party Libraries

This extension uses the following open-source libraries:

### Webpack (Development Tool)
- **Purpose**: Module bundling and build automation
- **License**: MIT License
- **Source**: https://webpack.js.org/
- **Usage**: Development and building only, not included in final extension

### Babel (Development Tool)
- **Purpose**: JavaScript transpilation
- **License**: MIT License  
- **Source**: https://babeljs.io/
- **Usage**: Development and building only, not included in final extension

### Jest (Development Tool)
- **Purpose**: Unit testing framework
- **License**: MIT License
- **Source**: https://jestjs.io/
- **Usage**: Development and testing only, not included in final extension

### ESLint (Development Tool)
- **Purpose**: Code linting and quality assurance
- **License**: MIT License
- **Source**: https://eslint.org/
- **Usage**: Development only, not included in final extension

**Note**: All development tools are used only during the build process and are not included in the final extension package distributed to users.

## Build Scripts

The project includes several npm scripts for building:

- `npm run build` - Production build with minification
- `npm run build:dev` - Development build without minification
- `npm run build:firefox` - Firefox-specific build
- `npm run package:firefox` - Package for Firefox submission
- `npm run test` - Run test suite
- `npm run lint` - Code quality checks
- `npm run typecheck` - TypeScript type checking

## Quality Assurance

Before submission, ensure:

1. **All tests pass**: `npm test`
2. **Code linting passes**: `npm run lint`
3. **Type checking passes**: `npm run typecheck`
4. **Manual testing**: Test in Firefox Developer Edition
5. **Security review**: All HTML content is properly sanitized

## Firefox Submission Notes

### Requirements Met
- ✅ Complete source code included
- ✅ Step-by-step build instructions provided
- ✅ Build script automation available
- ✅ OS and environment requirements documented
- ✅ No transpiled/minified source files (except in dist/)
- ✅ Third-party library usage and licensing documented

### Security Features
- ✅ HTML content sanitization prevents XSS attacks
- ✅ Content Security Policy compliant
- ✅ Secure API key handling
- ✅ Input validation on all user data

## Development Environment Setup

For optimal development experience:

```bash
# Install VS Code (recommended)
code --install-extension ms-vscode.vscode-eslint

# Install Firefox Developer Edition
# Download from https://www.mozilla.org/firefox/developer/

# Load extension for development
# 1. Open Firefox Developer Edition
# 2. Navigate to about:debugging
# 3. Click "Load Temporary Add-on"
# 4. Select the manifest.json file
```

## Troubleshooting

### Common Build Issues

**Node.js Version Too Old**
```bash
# Error: "Node.js version not supported"
# Solution: Upgrade to Node.js 16+
nvm install 16
nvm use 16
```

**Missing Dependencies**
```bash
# Error: "Module not found"
# Solution: Install dependencies
npm install
```

**Permission Errors**
```bash
# Error: "Permission denied"
# Solution: Check file permissions
chmod +x scripts/*.js
```

### Support

For build-related issues:
1. Check this README for solutions
2. Review existing GitHub Issues
3. Create new issue with detailed error information
4. Include OS, Node.js version, and npm version in bug reports

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## Privacy

See [PRIVACY.md](PRIVACY.md) for detailed privacy information.