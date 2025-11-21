#!/bin/bash

# Pre-deployment validation script
# Runs comprehensive checks before deployment

set -e

echo "🚀 Running pre-deployment validation..."

# Check if we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: Not on main branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled."
        exit 1
    fi
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# Run full validation
echo "🔧 Running validation checks..."
npm run validate

# Run comprehensive tests
echo "🧪 Running comprehensive tests..."
npm run test:all

# Build all versions
echo "🏗️  Building all versions..."
npm run build
npm run build:firefox

# Create all packages
echo "📦 Creating all packages..."
npm run package:all-formats

# Validate packages
echo "📋 Validating packages..."
VERSION=$(node -p "require('./package.json').version")

REQUIRED_PACKAGES=(
    "blog-link-analyzer-$VERSION.zip"
    "blog-link-analyzer-$VERSION.crx"
    "blog-link-analyzer-firefox-$VERSION.zip"
    "blog-link-analyzer-firefox-v$VERSION.xpi"
)

for package in "${REQUIRED_PACKAGES[@]}"; do
    if [ ! -f "$package" ]; then
        echo "❌ Required package not found: $package"
        exit 1
    fi
    
    # Check package size
    size=$(stat -c%s "$package" 2>/dev/null || stat -f%z "$package" 2>/dev/null || echo 0)
    if [ "$size" -eq 0 ]; then
        echo "❌ Package is empty: $package"
        exit 1
    fi
    
    echo "✅ Package validated: $package ($(($size / 1024))KB)"
done

# Security audit
echo "🔒 Running security audit..."
npm audit --audit-level=moderate

# Check for sensitive data
echo "🔍 Checking for sensitive data..."
if grep -r "API_KEY\|SECRET\|PASSWORD\|TOKEN" --include="*.js" --include="*.json" --exclude-dir=node_modules .; then
    echo "⚠️  Warning: Potential sensitive data found. Please review."
fi

# Version consistency check
echo "🔢 Checking version consistency..."
MANIFEST_VERSION=$(node -p "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')).version")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

if [ "$MANIFEST_VERSION" != "$PACKAGE_VERSION" ]; then
    echo "❌ Version mismatch: manifest.json ($MANIFEST_VERSION) != package.json ($PACKAGE_VERSION)"
    exit 1
fi

echo "✅ Pre-deployment validation completed successfully!"
echo ""
echo "📦 Ready for deployment:"
echo "   Version: $VERSION"
echo "   Branch: $CURRENT_BRANCH"
echo "   Packages: ${#REQUIRED_PACKAGES[@]} packages created"
echo ""
echo "🚀 Next steps:"
echo "   1. Push to main: git push origin main"
echo "   2. Create release: ./scripts/release.sh"
echo "   3. Upload to stores"