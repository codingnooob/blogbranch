# Chrome Web Store API V2 Integration

## Overview

This project now uses Chrome Web Store API V2 with a two-step upload/publish process to bypass the `PKG_MUST_UPDATE_AS_CRX` error that occurs with ZIP files.

## What Changed

### Before (API V1)
- Used `chrome-webstore-upload-cli` with API V1 endpoints
- Single-step upload process
- Required CRX format for legacy extensions
- Endpoint: `https://www.googleapis.com/chromewebstore/v1.1/items/`

### After (API V2)
- Uses custom script with API V2 endpoints
- Two-step process: upload → publish
- Native ZIP format support
- Endpoint: `https://chromewebstore.googleapis.com/v2/publishers/{publisherId}/items/{itemId}`

## Implementation Details

### CI/CD Pipeline Changes

**File**: `.github/workflows/ci-cd.yml`

```yaml
- name: Deploy to Chrome Web Store (API V2 Two-Step)
  id: chrome-deploy
  run: |
    chmod +x scripts/test-api-v2-two-step.sh
    ./scripts/test-api-v2-two-step.sh
  env:
    CHROME_EXTENSION_ID: ${{ secrets.CHROME_EXTENSION_ID }}
    CHROME_CLIENT_ID: ${{ secrets.CHROME_CLIENT_ID }}
    CHROME_CLIENT_SECRET: ${{ secrets.CHROME_CLIENT_SECRET }}
    CHROME_REFRESH_TOKEN: ${{ secrets.CHROME_REFRESH_TOKEN }}
    CHROME_PUBLISHER_ID: ${{ secrets.CHROME_PUBLISHER_ID }}
  continue-on-error: true
```

### Two-Step Process

**Script**: `scripts/test-api-v2-two-step.sh`

1. **Step 1**: Upload ZIP package
   ```
   POST https://chromewebstore.googleapis.com/upload/v2/publishers/{publisherId}/items/{itemId}:upload
   ```

2. **Step 2**: Publish to store
   ```
   POST https://chromewebstore.googleapis.com/v2/publishers/{publisherId}/items/{itemId}:publish
   ```

3. **Step 3**: Status verification
   ```
   GET https://chromewebstore.googleapis.com/v2/publishers/{publisherId}/items/{itemId}:fetchStatus
   ```

## Required Environment Variables

### Existing (No Changes Required)
- `CHROME_EXTENSION_ID` - Chrome Web Store extension ID
- `CHROME_CLIENT_ID` - OAuth client ID
- `CHROME_CLIENT_SECRET` - OAuth client secret
- `CHROME_REFRESH_TOKEN` - OAuth refresh token

### Optional (New)
- `CHROME_PUBLISHER_ID` - Publisher ID for API V2 (auto-detected if not provided)

## Benefits

### ✅ **Problem Solved**
- Bypasses `PKG_MUST_UPDATE_AS_CRX` error
- Native ZIP format support
- No CRX conversion required

### ✅ **Technical Improvements**
- Uses modern API V2 endpoints
- Better error handling and state tracking
- Separated upload/publish operations
- More granular status reporting

### ✅ **Operational Benefits**
- Higher deployment success rate
- Better debugging capabilities
- Future-proof implementation
- Maintains existing workflow

## Validation Updates

**File**: `scripts/validate-deployment.sh`

Updated to support both API V1 and API V2 endpoints:

```bash
if [ -n "$PUBLISHER_ID" ]; then
    # Use API V2
    STATUS_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "https://chromewebstore.googleapis.com/v2/$ITEM_NAME:fetchStatus")
else
    # Fallback to API V1
    STATUS_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "https://www.googleapis.com/chromewebstore/v1.1/items/$EXTENSION_ID")
fi
```

## Troubleshooting

### Common Issues

1. **Missing Publisher ID**
   - **Solution**: Set `CHROME_PUBLISHER_ID` secret or let script auto-detect

2. **Upload State Stuck**
   - **Solution**: Script includes automatic polling for upload completion

3. **Authentication Errors**
   - **Solution**: Verify OAuth credentials are valid and not expired

### Debug Mode

Run the script locally for debugging:
```bash
export CHROME_EXTENSION_ID="your-extension-id"
export CHROME_CLIENT_ID="your-client-id"
export CHROME_CLIENT_SECRET="your-client-secret"
export CHROME_REFRESH_TOKEN="your-refresh-token"
./scripts/test-api-v2-two-step.sh
```

## Migration Notes

### Backward Compatibility
- Existing OAuth credentials work unchanged
- No changes to Firefox deployment
- Maintains same CI/CD triggers

### Rollback Plan
If API V2 fails, you can rollback to API V1 by:
1. Reverting CI/CD workflow changes
2. Reinstalling `chrome-webstore-upload-cli`
3. Restoring original deployment step

## Future Enhancements

### Service Account Support
Additional scripts available for service account authentication:
- `scripts/test-api-v2-service-account.sh`
- Requires Google Cloud setup
- More secure for CI/CD

### Advanced Features
- Custom publish targets (trustedTesters vs all)
- Deploy percentage control
- Automated rollback on failure

## Support

For issues with the API V2 integration:
1. Check workflow logs for detailed error messages
2. Verify all required secrets are set correctly
3. Test locally using the provided scripts
4. Check Chrome Web Store Developer Dashboard for manual upload capability