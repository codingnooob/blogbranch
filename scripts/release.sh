#!/bin/bash

# Release Script
# Handles complete release process with automated deployment

set -e

VERSION_TYPE=${1:-patch}
MESSAGE=${2:-"Automated release"}

echo "🚀 Starting release process: $VERSION_TYPE"
echo "📝 Message: $MESSAGE"

# Run version bump
echo "🔄 Running version bump..."
./scripts/version.sh "$VERSION_TYPE" "$MESSAGE"

# Get new version
NEW_VERSION=$(node -p "JSON.parse(require('fs').readFileSync('../package.json', 'utf8')).version")
echo "🎉 Release version: $NEW_VERSION"

# Create GitHub release (if gh CLI is available)
if command -v gh &> /dev/null; then
    echo "📤 Creating GitHub release..."
    
    # Prepare release notes
    RELEASE_NOTES="## Blog Link Analyzer v$NEW_VERSION

$MESSAGE

### 📦 Packages
- Chrome Web Store: \`blog-link-analyzer-$NEW_VERSION.zip\`
- Firefox Add-ons: \`blog-link-analyzer-firefox-$NEW_VERSION.zip\`
- Self-hosted: \`blog-link-analyzer-$NEW_VERSION.crx\` and \`blog-link-analyzer-firefox-v$NEW_VERSION.xpi\`

### ✨ Features
- AI-powered blog content summarization
- Support for OpenAI, Anthropic, Ollama, and custom AI providers
- Cross-browser compatibility (Chrome & Firefox)
- Enhanced blog detection algorithms

### 🔧 Installation
#### Chrome Web Store
1. Visit Chrome Web Store (link will be available after approval)
2. Click 'Add to Chrome'
3. Grant necessary permissions

#### Firefox Add-ons
1. Visit Firefox Add-ons Developer Hub (link will be available after approval)
2. Click 'Add to Firefox'
3. Grant necessary permissions

#### Self-hosted
1. Download the appropriate package for your browser
2. Load the extension in developer mode
3. Configure your AI provider settings

### 📋 Changelog
$MESSAGE"

    # Create release
    gh release create "v$NEW_VERSION" \
        *.zip \
        *.crx \
        *.xpi \
        --title "Blog Link Analyzer v$NEW_VERSION" \
        --notes "$RELEASE_NOTES"
    
    echo "✅ GitHub release created successfully!"
else
    echo "⚠️  GitHub CLI not found. Skipping automatic GitHub release."
    echo "📋 To create release manually:"
    echo "   1. Push changes: git push origin main && git push origin v$NEW_VERSION"
    echo "   2. Create release on GitHub with attached packages"
fi

echo "🎉 Release process completed!"
echo "📦 Ready for store deployment:"
echo "   - Chrome: blog-link-analyzer-$NEW_VERSION.zip"
echo "   - Firefox: blog-link-analyzer-firefox-$NEW_VERSION.zip"