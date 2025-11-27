# Chrome Web Store API V2 Authentication Fix

## Issue Identified

The diagnostic tool revealed that the **Publisher ID** should be the **Google Cloud project number** (numeric), not the project ID (text-based).

## Current Configuration
- **Project ID**: `blogbranch` 
- **Current Publisher ID**: `blogbranch` (incorrect - text-based)
- **Required Publisher ID**: `413467977054` (correct - numeric project number)
- **Service Account Email**: `chrome-webstore-deployer@blogbranch.iam.gserviceaccount.com`

## Fix Required

Update GitHub secret `CHROME_PUBLISHER_ID` from:
```
blogbranch
```
To:
```
413467977054
```

## Verification Steps

1. Go to GitHub repository Settings → Secrets and variables → Actions
2. Find `CHROME_PUBLISHER_ID` secret
3. Update value to `413467977054`
4. Save changes
5. Trigger workflow to test

## Expected Result

After fixing the publisher ID:
- API endpoint `/v2/publishers/413467977054/items` should be found (no more 404)
- Authentication should work properly (no more 401)
- Chrome Web Store deployment should succeed

## Additional Verification

The diagnostic tool also confirmed:
- ✅ Service account authentication works (access token obtained)
- ✅ Service account email format is correct
- ✅ Project ID is correct
- ❌ Publisher ID format needs to be numeric

## Root Cause

Chrome Web Store API V2 expects the publisher ID to be the **numeric Google Cloud project number**, not the alphanumeric project ID. This is different from many other Google APIs that use the project ID.

## Files Modified

1. `scripts/test-chrome-api.js` - Added diagnostic tool
2. `scripts/get-project-info.js` - Project information helper
3. `jest.config.js` - Excluded diagnostic script from tests