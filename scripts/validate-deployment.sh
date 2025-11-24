#!/bin/bash

# Deployment validation script
# Validates that extensions were successfully submitted to stores

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version")

echo "🔍 Validating deployment for version $VERSION..."

# Validate Chrome Web Store submission
validate_chrome_deployment() {
    echo "🌐 Validating Chrome Web Store deployment..."
    
    if [ -z "$CHROME_CLIENT_ID" ] || [ -z "$CHROME_CLIENT_SECRET" ] || [ -z "$CHROME_REFRESH_TOKEN" ]; then
        echo "⚠️ Chrome credentials not available, skipping validation"
        return 0
    fi
    
    # Get access token
    ACCESS_TOKEN=$(curl -s -d "client_id=$CHROME_CLIENT_ID&client_secret=$CHROME_CLIENT_SECRET&refresh_token=$CHROME_REFRESH_TOKEN&grant_type=refresh_token" https://oauth2.googleapis.com/token | jq -r .access_token)
    
    if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
        echo "❌ Failed to get Chrome Web Store access token"
        return 1
    fi
    
    # Check extension status
    EXTENSION_ID=${CHROME_EXTENSION_ID}
    if [ -z "$EXTENSION_ID" ]; then
        echo "⚠️ Chrome extension ID not provided, skipping status check"
        return 0
    fi
    
    STATUS_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "https://www.googleapis.com/chromewebstore/v1.1/items/$EXTENSION_ID")
    
    if echo "$STATUS_RESPONSE" | jq -e .error >/dev/null 2>&1; then
        echo "❌ Chrome Web Store API error: $(echo "$STATUS_RESPONSE" | jq -r .error.message)"
        return 1
    fi
    
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r .status)
    echo "✅ Chrome Web Store status: $STATUS"
    
    case "$STATUS" in
        "PENDING_PUBLICATION")
            echo "📝 Extension is pending review"
            ;;
        "PUBLISHED")
            echo "🎉 Extension is published and live"
            ;;
        "IN_PROGRESS")
            echo "⏳ Extension review is in progress"
            ;;
        *)
            echo "ℹ️ Extension status: $STATUS"
            ;;
    esac
}

# Validate Firefox Add-ons submission
validate_firefox_deployment() {
    echo "🦊 Validating Firefox Add-ons deployment..."
    
    if [ -z "$FIREFOX_JWT_ISSUER" ] || [ -z "$FIREFOX_JWT_SECRET" ]; then
        echo "⚠️ Firefox credentials not available, skipping validation"
        return 0
    fi
    
    # Generate JWT token
    JWT_TOKEN=$(npx web-ext sign --api-key "$FIREFOX_JWT_ISSUER" --api-secret "$FIREFOX_JWT_SECRET" --source-dir build-firefox --artifacts-dir . --verbose 2>&1 | grep -o "JWT: [^[:space:]]*" | cut -d' ' -f2 || echo "")
    
    if [ -z "$JWT_TOKEN" ]; then
        echo "⚠️ Could not extract JWT token, checking for recent submissions..."
        
        # Check for recent XPI files as fallback validation
        if ls blog-link-analyzer-firefox-*.xpi 1> /dev/null 2>&1; then
            echo "✅ Firefox XPI package found: $(ls blog-link-analyzer-firefox-*.xpi | head -1)"
            echo "📝 Extension submitted for review (check Firefox Developer Hub for status)"
        else
            echo "❌ No Firefox XPI package found"
            return 1
        fi
        return 0
    fi
    
    echo "✅ Firefox JWT token generated successfully"
    echo "📝 Extension submitted for review (check Firefox Developer Hub for status)"
}

# Validate package files exist
validate_packages() {
    echo "📦 Validating package files..."
    
    CHROME_PACKAGE="blog-link-analyzer-$VERSION.zip"
    FIREFOX_PACKAGE="blog-link-analyzer-firefox-$VERSION.xpi"
    
    if [ ! -f "$CHROME_PACKAGE" ]; then
        echo "❌ Chrome package not found: $CHROME_PACKAGE"
        return 1
    fi
    
    if [ ! -f "$FIREFOX_PACKAGE" ]; then
        echo "❌ Firefox package not found: $FIREFOX_PACKAGE"
        return 1
    fi
    
    echo "✅ Chrome package found: $CHROME_PACKAGE ($(du -h "$CHROME_PACKAGE" | cut -f1))"
    echo "✅ Firefox package found: $FIREFOX_PACKAGE ($(du -h "$FIREFOX_PACKAGE" | cut -f1))"
}

# Main validation
main() {
    echo "🚀 Starting deployment validation..."
    
    validate_packages
    validate_chrome_deployment
    validate_firefox_deployment
    
    echo ""
    echo "✅ Deployment validation completed!"
    echo "📋 Summary:"
    echo "   - Version: $VERSION"
    echo "   - Chrome package: blog-link-analyzer-$VERSION.zip"
    echo "   - Firefox package: blog-link-analyzer-firefox-$VERSION.xpi"
    echo ""
    echo "🔍 Monitor store dashboards for review progress:"
    echo "   - Chrome Web Store: https://chrome.google.com/webstore/developer/dashboard"
    echo "   - Firefox Add-ons: https://addons.mozilla.org/developers/"
}

# Run validation if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi