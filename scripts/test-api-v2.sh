#!/bin/bash

# Chrome Web Store API V2 Direct Test Script
# Tests the new API V2 endpoints to bypass potential legacy format restrictions

set -e

echo "🔬 Chrome Web Store API V2 Direct Test"
echo "====================================="

# Configuration
EXTENSION_ID="${CHROME_EXTENSION_ID}"
CLIENT_ID="${CHROME_CLIENT_ID}"
CLIENT_SECRET="${CHROME_CLIENT_SECRET}"
REFRESH_TOKEN="${CHROME_REFRESH_TOKEN}"
PUBLISHER_ID="${CHROME_PUBLISHER_ID}"

# Check required environment variables
if [[ -z "$EXTENSION_ID" || -z "$CLIENT_ID" || -z "$CLIENT_SECRET" || -z "$REFRESH_TOKEN" ]]; then
    echo "❌ Missing required environment variables:"
    echo "   CHROME_EXTENSION_ID: ${EXTENSION_ID:+✅}${EXTENSION_ID:-❌}"
    echo "   CHROME_CLIENT_ID: ${CLIENT_ID:+✅}${CLIENT_ID:-❌}"
    echo "   CHROME_CLIENT_SECRET: ${CLIENT_SECRET:+✅}${CLIENT_SECRET:-❌}"
    echo "   CHROME_REFRESH_TOKEN: ${REFRESH_TOKEN:+✅}${REFRESH_TOKEN:-❌}"
    echo ""
    echo "Please set these environment variables and try again."
    exit 1
fi

# Find the ZIP file to upload
ZIP_FILE=$(ls -1 blog-link-analyzer-*.zip 2>/dev/null | head -n 1)
if [[ -z "$ZIP_FILE" ]]; then
    echo "❌ No ZIP file found. Please build the extension first."
    exit 1
fi

echo "📦 Using ZIP file: $ZIP_FILE"
echo "🆔 Extension ID: $EXTENSION_ID"

# Step 1: Get OAuth access token using refresh token
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

# Step 2: Test API V2 upload endpoint
echo ""
echo "📤 Step 2: Testing API V2 upload..."

# Use the extension ID as the item ID for the API call
ITEM_NAME="publishers/$PUBLISHER_ID/items/$EXTENSION_ID"

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
echo "✅ API V2 test completed"
echo "Check the responses above to determine if the upload was successful"