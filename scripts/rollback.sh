#!/bin/bash

# Rollback script for browser extension deployments
# Usage: ./scripts/rollback.sh [version] [stores]

set -e

VERSION=${1:-"latest"}
STORES=${2:-"chrome,firefox"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔄 Starting rollback process..."
echo "Version: $VERSION"
echo "Stores: $STORES"

# Get current version if "latest" is specified
if [ "$VERSION" = "latest" ]; then
    VERSION=$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "1.1.1")
    echo "Rolling back to latest stable version: $VERSION"
fi

# Check if version exists
if ! git rev-parse "v$VERSION" >/dev/null 2>&1; then
    echo "❌ Version v$VERSION not found in git history"
    exit 1
fi

# Create rollback branch
ROLLBACK_BRANCH="rollback/v$VERSION-$(date +%s)"
echo "📂 Creating rollback branch: $ROLLBACK_BRANCH"
git checkout -b "$ROLLBACK_BRANCH" "v$VERSION"

# Build the rollback version
echo "🔨 Building rollback version..."
cd "$PROJECT_ROOT"
npm ci --ignore-scripts
npm run build
npm run build:firefox
npm run package:all-formats

# Deploy to specified stores
IFS=',' read -ra STORE_ARRAY <<< "$STORES"
for store in "${STORE_ARRAY[@]}"; do
    store=$(echo "$store" | xargs) # trim whitespace
    case "$store" in
        "chrome")
            echo "🌐 Rolling back Chrome Web Store..."
            if [ -n "$CHROME_CLIENT_ID" ] && [ -n "$CHROME_CLIENT_SECRET" ] && [ -n "$CHROME_REFRESH_TOKEN" ]; then
                npx bpp@latest \
                    --client-id "$CHROME_CLIENT_ID" \
                    --client-secret "$CHROME_CLIENT_SECRET" \
                    --refresh-token "$CHROME_REFRESH_TOKEN" \
                    --zip "blog-link-analyzer-$VERSION.zip" \
                    --extension-id "$CHROME_EXTENSION_ID"
                echo "✅ Chrome rollback submitted"
            else
                echo "⚠️ Chrome credentials not available, skipping Chrome rollback"
            fi
            ;;
        "firefox")
            echo "🦊 Rolling back Firefox Add-ons..."
            if [ -n "$FIREFOX_JWT_ISSUER" ] && [ -n "$FIREFOX_JWT_SECRET" ]; then
                npx web-ext sign \
                    --api-key "$FIREFOX_JWT_ISSUER" \
                    --api-secret "$FIREFOX_JWT_SECRET" \
                    --source-dir "build-firefox" \
                    --artifacts-dir "."
                echo "✅ Firefox rollback submitted"
            else
                echo "⚠️ Firefox credentials not available, skipping Firefox rollback"
            fi
            ;;
        *)
            echo "⚠️ Unknown store: $store"
            ;;
    esac
done

# Create rollback tag
ROLLBACK_TAG="rollback/v$VERSION-$(date +%Y%m%d-%H%M%S)"
echo "🏷️ Creating rollback tag: $ROLLBACK_TAG"
git tag "$ROLLBACK_TAG"

# Push rollback branch and tag
echo "📤 Pushing rollback branch and tag..."
git push origin "$ROLLBACK_BRANCH"
git push origin "$ROLLBACK_TAG"

echo "✅ Rollback completed successfully!"
echo "📋 Rollback details:"
echo "   - Version: v$VERSION"
echo "   - Branch: $ROLLBACK_BRANCH"
echo "   - Tag: $ROLLBACK_TAG"
echo "   - Stores: $STORES"
echo ""
echo "🔍 Monitor the store dashboards for rollback approval status."