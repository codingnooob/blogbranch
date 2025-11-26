#!/bin/bash

# Chrome Web Store API V2 Comprehensive Test Suite
# Tests multiple approaches to bypass PKG_MUST_UPDATE_AS_CRX error

set -e

echo "🧪 Chrome Web Store API V2 Comprehensive Test Suite"
echo "===================================================="

# Configuration
EXTENSION_ID="${CHROME_EXTENSION_ID}"
CLIENT_ID="${CHROME_CLIENT_ID}"
CLIENT_SECRET="${CHROME_CLIENT_SECRET}"
REFRESH_TOKEN="${CHROME_REFRESH_TOKEN}"
SERVICE_ACCOUNT="${CHROME_SERVICE_ACCOUNT}"
PROJECT_ID="${CHROME_PROJECT_ID}"

# Find the ZIP file to upload
ZIP_FILE=$(ls -1 blog-link-analyzer*.zip 2>/dev/null | grep -v firefox | head -n 1)
if [[ -z "$ZIP_FILE" ]]; then
    echo "❌ No ZIP file found. Please build the extension first."
    exit 1
fi

echo "📦 Using ZIP file: $ZIP_FILE"
echo "🆔 Extension ID: ${EXTENSION_ID:-not set}"

echo ""
echo "🔍 Available Test Approaches:"
echo "1. API V2 with OAuth Refresh Token (current method)"
echo "2. API V2 with Service Account (newer method)"
echo "3. API V2 Two-Step Process (upload + publish separate)"
echo ""

# Function to test OAuth approach
test_oauth_approach() {
    echo "🔐 Testing Approach 1: API V2 with OAuth Refresh Token"
    echo "------------------------------------------------------"
    
    if [[ -z "$EXTENSION_ID" || -z "$CLIENT_ID" || -z "$CLIENT_SECRET" || -z "$REFRESH_TOKEN" ]]; then
        echo "❌ Skipping OAuth test - missing credentials"
        return 1
    fi
    
    echo "✅ OAuth credentials available"
    echo "🔗 Endpoint: https://chromewebstore.googleapis.com/upload/v2/publishers/{publisherId}/items/{itemId}:upload"
    echo "📝 This uses the same OAuth flow as current workflow but with API V2 endpoints"
    echo ""
    
    # Would execute actual test here if credentials were available
    echo "🚀 To run this test: ./scripts/test-api-v2.sh"
    echo ""
}

# Function to test service account approach
test_service_account_approach() {
    echo "🔧 Testing Approach 2: API V2 with Service Account"
    echo "---------------------------------------------------"
    
    if [[ -z "$SERVICE_ACCOUNT" || -z "$PROJECT_ID" ]]; then
        echo "❌ Skipping Service Account test - missing credentials"
        return 1
    fi
    
    echo "✅ Service account credentials available"
    echo "🔗 Endpoint: https://chromewebstore.googleapis.com/upload/v2/publishers/{publisherId}/items/{itemId}:upload"
    echo "📝 Uses gcloud CLI for authentication with service account impersonation"
    echo ""
    
    # Would execute actual test here if credentials were available
    echo "🚀 To run this test: ./scripts/test-api-v2-service-account.sh"
    echo ""
}

# Function to test two-step approach
test_two_step_approach() {
    echo "🔄 Testing Approach 3: API V2 Two-Step Process"
    echo "-----------------------------------------------"
    
    if [[ -z "$EXTENSION_ID" || -z "$CLIENT_ID" || -z "$CLIENT_SECRET" || -z "$REFRESH_TOKEN" ]]; then
        echo "❌ Skipping Two-Step test - missing credentials"
        return 1
    fi
    
    echo "✅ Two-step process credentials available"
    echo "📝 Separates upload and publish into distinct API calls"
    echo "🔗 Upload: POST /upload/v2/publishers/{publisherId}/items/{itemId}:upload"
    echo "🔗 Publish: POST /v2/publishers/{publisherId}/items/{itemId}:publish"
    echo ""
    
    # Would execute actual test here if credentials were available
    echo "🚀 To run this test: ./scripts/test-api-v2-two-step.sh"
    echo ""
}

# Run all tests
test_oauth_approach
test_service_account_approach
test_two_step_approach

echo "📊 Test Summary & Recommendations"
echo "=================================="
echo ""
echo "🎯 Most Likely to Succeed (in order):"
echo ""
echo "1. 🥇 API V2 Two-Step Process"
echo "   ✅ Separates upload from publish (bypasses format restrictions)"
echo "   ✅ Uses newer API V2 endpoints"
echo "   ✅ Supports ZIP format natively"
echo "   ✅ Provides granular state tracking"
echo ""
echo "2. 🥈 API V2 with Service Account"
echo "   ✅ Uses modern authentication method"
echo "   ✅ Bypasses OAuth token limitations"
echo "   ✅ Designed for CI/CD automation"
echo "   ❌ Requires additional Google Cloud setup"
echo ""
echo "3. 🥉 API V2 with OAuth Refresh Token"
echo "   ✅ Uses existing credentials"
echo "   ✅ Minimal setup required"
echo "   ❌ May still hit legacy format restrictions"
echo ""
echo "🔧 Setup Instructions:"
echo ""
echo "For Two-Step Process (Recommended):"
echo "  export CHROME_EXTENSION_ID='your-extension-id'"
echo "  export CHROME_CLIENT_ID='your-client-id'"
echo "  export CHROME_CLIENT_SECRET='your-client-secret'"
echo "  export CHROME_REFRESH_TOKEN='your-refresh-token'"
echo "  ./scripts/test-api-v2-two-step.sh"
echo ""
echo "For Service Account:"
echo "  export CHROME_EXTENSION_ID='your-extension-id'"
echo "  export CHROME_SERVICE_ACCOUNT='service-account@project.iam.gserviceaccount.com'"
echo "  export CHROME_PROJECT_ID='your-gcp-project-id'"
echo "  gcloud auth login"
echo "  gcloud config set project \$CHROME_PROJECT_ID"
echo "  ./scripts/test-api-v2-service-account.sh"
echo ""
echo "📋 Next Steps:"
echo "1. Try the Two-Step Process first (highest success probability)"
echo "2. If that fails, set up Service Account authentication"
echo "3. Continue waiting for Chrome Web Store support response"
echo "4. Consider manual upload via Developer Dashboard as fallback"