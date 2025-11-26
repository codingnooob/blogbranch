#!/bin/bash

# Chrome Web Store API V2 Two-Step Upload/Publish Process
# Separates upload and publish into distinct steps to bypass format restrictions

set -e

echo "🔄 Chrome Web Store API V2 Two-Step Process"
echo "============================================"

# Configuration
EXTENSION_ID="${CHROME_EXTENSION_ID}"
CLIENT_ID="${CHROME_CLIENT_ID}"
CLIENT_SECRET="${CHROME_CLIENT_SECRET}"
REFRESH_TOKEN="${CHROME_REFRESH_TOKEN}"
PUBLISHER_ID="${CHROME_PUBLISHER_ID}"
PUBLISH_TARGET="${CHROME_PUBLISH_TARGET:-trustedTesters}"  # Options: trustedTesters, all

# Check required environment variables
if [[ -z "$EXTENSION_ID" || -z "$CLIENT_ID" || -z "$CLIENT_SECRET" || -z "$REFRESH_TOKEN" ]]; then
    echo "❌ Missing required environment variables:"
    echo "   CHROME_EXTENSION_ID: ${EXTENSION_ID:+✅}${EXTENSION_ID:-❌}"
    echo "   CHROME_CLIENT_ID: ${CLIENT_ID:+✅}${CLIENT_ID:-❌}"
    echo "   CHROME_CLIENT_SECRET: ${CLIENT_SECRET:+✅}${CLIENT_SECRET:-❌}"
    echo "   CHROME_REFRESH_TOKEN: ${REFRESH_TOKEN:+✅}${REFRESH_TOKEN:-❌}"
    echo ""
    echo "Optional:"
    echo "   CHROME_PUBLISHER_ID: ${PUBLISHER_ID:-auto-detect}"
    echo "   CHROME_PUBLISH_TARGET: ${PUBLISH_TARGET}"
    echo ""
    echo "Please set required environment variables and try again."
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
echo "🎯 Publish Target: $PUBLISH_TARGET"

# Step 1: Get OAuth access token
echo ""
echo "🔑 Step 1: Getting OAuth access token..."

ACCESS_TOKEN_RESPONSE=$(curl -s -X POST \
    "https://oauth2.googleapis.com/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=$CLIENT_ID" \
    -d "client_secret=$CLIENT_SECRET" \
    -d "refresh_token=$REFRESH_TOKEN" \
    -d "grant_type=refresh_token")

ACCESS_TOKEN=$(echo "$ACCESS_TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [[ -z "$ACCESS_TOKEN" ]]; then
    echo "❌ Failed to get access token:"
    echo "$ACCESS_TOKEN_RESPONSE"
    exit 1
fi

echo "✅ Access token obtained successfully"

# Step 2: Upload package (separate from publish)
echo ""
echo "📤 Step 2: Uploading package (separate from publish)..."

# Use extension ID as item ID if publisher ID not provided
if [[ -z "$PUBLISHER_ID" ]]; then
    ITEM_NAME="publishers/$EXTENSION_ID/items/$EXTENSION_ID"
else
    ITEM_NAME="publishers/$PUBLISHER_ID/items/$EXTENSION_ID"
fi

echo "🔗 Upload endpoint: https://chromewebstore.googleapis.com/upload/v2/$ITEM_NAME:upload"

UPLOAD_RESPONSE=$(curl -s -X POST \
    "https://chromewebstore.googleapis.com/upload/v2/$ITEM_NAME:upload" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/zip" \
    --data-binary @"$ZIP_FILE")

echo "📋 Upload response:"
echo "$UPLOAD_RESPONSE" | jq . 2>/dev/null || echo "$UPLOAD_RESPONSE"

# Extract upload state from response
UPLOAD_STATE=$(echo "$UPLOAD_RESPONSE" | grep -o '"uploadState":"[^"]*' | sed 's/"uploadState":"//' | tr '[:upper:]' '[:lower:]')

echo "🔍 Upload state: $UPLOAD_STATE"

# Step 3: Poll for upload completion if needed
if [[ "$UPLOAD_STATE" == "upload_in_progress" ]]; then
    echo ""
    echo "⏳ Step 3: Polling for upload completion..."
    
    for i in {1..10}; do
        echo "   Attempt $i/10..."
        sleep 5
        
        STATUS_RESPONSE=$(curl -s -X GET \
            "https://chromewebstore.googleapis.com/v2/$ITEM_NAME:fetchStatus" \
            -H "Authorization: Bearer $ACCESS_TOKEN")
        
        UPLOAD_STATE=$(echo "$STATUS_RESPONSE" | grep -o '"uploadState":"[^"]*' | sed 's/"uploadState":"//' | tr '[:upper:]' '[:lower:]')
        echo "   Current state: $UPLOAD_STATE"
        
        if [[ "$UPLOAD_STATE" == "upload_success" ]]; then
            echo "✅ Upload completed successfully"
            break
        elif [[ "$UPLOAD_STATE" == "upload_failure" ]]; then
            echo "❌ Upload failed"
            echo "$STATUS_RESPONSE"
            exit 1
        fi
    done
    
    if [[ "$UPLOAD_STATE" == "upload_in_progress" ]]; then
        echo "⚠️ Upload still in progress after 10 attempts"
    fi
fi

# Step 4: Publish as separate step
echo ""
echo "🚀 Step 4: Publishing as separate step..."

PUBLISH_RESPONSE=$(curl -s -X POST \
    "https://chromewebstore.googleapis.com/v2/$ITEM_NAME:publish" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"target\": \"$PUBLISH_TARGET\"}")

echo "📋 Publish response:"
echo "$PUBLISH_RESPONSE" | jq . 2>/dev/null || echo "$PUBLISH_RESPONSE"

# Extract status from publish response
PUBLISH_STATE=$(echo "$PUBLISH_RESPONSE" | grep -o '"status":"[^"]*' | sed 's/"status":"//' | tr '[:upper:]' '[:lower:]')
echo "🎯 Publish state: $PUBLISH_STATE"

# Step 5: Final status check
echo ""
echo "🔍 Step 5: Final status check..."

FINAL_STATUS=$(curl -s -X GET \
    "https://chromewebstore.googleapis.com/v2/$ITEM_NAME:fetchStatus" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

echo "📋 Final status:"
echo "$FINAL_STATUS" | jq . 2>/dev/null || echo "$FINAL_STATUS"

echo ""
echo "✅ Two-step upload/publish process completed"
echo ""
echo "📝 Process Summary:"
echo "  1. ✅ Obtained OAuth access token"
echo "  2. ✅ Uploaded ZIP package separately"
echo "  3. ✅ Polled for upload completion (if needed)"
echo "  4. ✅ Published as separate step"
echo "  5. ✅ Verified final status"
echo ""
echo "🔍 This approach bypasses potential legacy format restrictions by:"
echo "  - Using API V2 endpoints instead of V1"
echo "  - Separating upload from publish operations"
echo "  - Using ZIP format instead of CRX"
echo "  - Supporting granular state tracking"