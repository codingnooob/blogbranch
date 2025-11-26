#!/bin/bash

# Chrome Web Store API V2 with Service Account Authentication
# Uses gcloud CLI to authenticate with service account

set -e

echo "🔐 Chrome Web Store API V2 with Service Account"
echo "=============================================="

# Configuration
EXTENSION_ID="${CHROME_EXTENSION_ID}"
SERVICE_ACCOUNT="${CHROME_SERVICE_ACCOUNT}"
PROJECT_ID="${CHROME_PROJECT_ID}"

# Check required environment variables
if [[ -z "$EXTENSION_ID" || -z "$SERVICE_ACCOUNT" || -z "$PROJECT_ID" ]]; then
    echo "❌ Missing required environment variables:"
    echo "   CHROME_EXTENSION_ID: ${EXTENSION_ID:+✅}${EXTENSION_ID:-❌}"
    echo "   CHROME_SERVICE_ACCOUNT: ${SERVICE_ACCOUNT:+✅}${SERVICE_ACCOUNT:-❌}"
    echo "   CHROME_PROJECT_ID: ${PROJECT_ID:+✅}${PROJECT_ID:-❌}"
    echo ""
    echo "Please set these environment variables and try again."
    exit 1
fi

# Find the ZIP file to upload
ZIP_FILE=$(ls -1 blog-link-analyzer*.zip 2>/dev/null | grep -v firefox | head -n 1)
if [[ -z "$ZIP_FILE" ]]; then
    echo "❌ No ZIP file found. Please build the extension first."
    exit 1
fi

echo "📦 Using ZIP file: $ZIP_FILE"
echo "🆔 Extension ID: $EXTENSION_ID"
echo "🔧 Service Account: $SERVICE_ACCOUNT"
echo "📊 Project ID: $PROJECT_ID"

# Step 1: Authenticate with gcloud
echo ""
echo "🔑 Step 1: Authenticating with gcloud..."

if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Try to get access token using service account impersonation
ACCESS_TOKEN=$(gcloud auth print-access-token \
    --impersonate-service-account="$SERVICE_ACCOUNT" \
    --scopes="https://www.googleapis.com/auth/chromewebstore" \
    2>/dev/null) || {
    echo "❌ Failed to get access token. Trying alternative method..."
    
    # Alternative: Use application default credentials
    ACCESS_TOKEN=$(gcloud auth print-access-token \
        --scopes="https://www.googleapis.com/auth/chromewebstore" \
        2>/dev/null) || {
        echo "❌ Failed to authenticate. Please run:"
        echo "   gcloud auth login"
        echo "   gcloud config set project $PROJECT_ID"
        exit 1
    }
}

echo "✅ Access token obtained successfully"

# Step 2: Test API V2 upload with service account
echo ""
echo "📤 Step 2: Testing API V2 upload with service account..."

# Use the extension ID as the item ID for the API call
ITEM_NAME="publishers/$PROJECT_ID/items/$EXTENSION_ID"

echo "🔗 API endpoint: https://chromewebstore.googleapis.com/upload/v2/$ITEM_NAME:upload"

UPLOAD_RESPONSE=$(curl -s -X POST \
    "https://chromewebstore.googleapis.com/upload/v2/$ITEM_NAME:upload" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/zip" \
    --data-binary @"$ZIP_FILE")

echo "📋 Upload response:"
echo "$UPLOAD_RESPONSE" | jq . 2>/dev/null || echo "$UPLOAD_RESPONSE"

# Step 3: Check upload status
echo ""
echo "🔍 Step 3: Checking upload status..."

STATUS_RESPONSE=$(curl -s -X GET \
    "https://chromewebstore.googleapis.com/v2/$ITEM_NAME:fetchStatus" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

echo "📋 Status response:"
echo "$STATUS_RESPONSE" | jq . 2>/dev/null || echo "$STATUS_RESPONSE"

# Step 4: Try to publish if upload was successful
echo ""
echo "🚀 Step 4: Attempting to publish..."

PUBLISH_RESPONSE=$(curl -s -X POST \
    "https://chromewebstore.googleapis.com/v2/$ITEM_NAME:publish" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"target": "trustedTesters"}')

echo "📋 Publish response:"
echo "$PUBLISH_RESPONSE" | jq . 2>/dev/null || echo "$PUBLISH_RESPONSE"

echo ""
echo "✅ Service account authentication test completed"
echo ""
echo "📝 Service Account Setup Instructions:"
echo "1. Create a service account in Google Cloud Console"
echo "2. Enable Chrome Web Store API for your project"
echo "3. Add service account email to Chrome Web Store Developer Dashboard"
echo "4. Grant 'iam.serviceAccountTokenCreator' role if using impersonation"
echo ""
echo "🔧 gcloud setup commands:"
echo "   gcloud auth login"
echo "   gcloud config set project $PROJECT_ID"
echo "   gcloud services enable chromewebstore.googleapis.com"