#!/bin/bash

# Version Management Script
# Handles semantic versioning and git tagging

set -e

VERSION_TYPE=$1
MESSAGE=${2:-"Automated version bump"}

if [[ -z "$VERSION_TYPE" ]]; then
    echo "Usage: ./scripts/version.sh [patch|minor|major] [message]"
    echo "Example: ./scripts/version.sh patch 'Fix AI service connection issue'"
    exit 1
fi

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "Error: Version type must be patch, minor, or major"
    exit 1
fi

echo "🔄 Starting version bump: $VERSION_TYPE"
echo "📝 Message: $MESSAGE"

# Run validation before version bump
echo "🔍 Running validation checks..."
npm run validate

if [ $? -ne 0 ]; then
    echo "❌ Validation failed. Please fix issues before versioning."
    exit 1
fi

echo "✅ Validation passed"

# Get current version
CURRENT_VERSION=$(node -p "require('../package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Bump version
echo "🔢 Bumping version..."
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('../package.json').version")
echo "🎉 New version: $NEW_VERSION"

# Build and package
echo "🏗️  Building extension..."
npm run build
npm run build:firefox

echo "📦 Creating packages..."
npm run package:all-formats

# Create git tag
TAG_NAME="v$NEW_VERSION"
echo "🏷️  Creating git tag: $TAG_NAME"

# Add all changes
git add .
git commit -m "chore(release): $NEW_VERSION

$MESSAGE

[skip ci]"

# Create and push tag
git tag -a "$TAG_NAME" -m "Release $NEW_VERSION

$MESSAGE"

echo "✅ Version bump completed successfully!"
echo "📋 Summary:"
echo "   - Version: $CURRENT_VERSION → $NEW_VERSION"
echo "   - Tag: $TAG_NAME"
echo "   - Packages created: *.zip, *.crx, *.xpi"
echo ""
echo "🚀 To push changes:"
echo "   git push origin main"
echo "   git push origin $TAG_NAME"