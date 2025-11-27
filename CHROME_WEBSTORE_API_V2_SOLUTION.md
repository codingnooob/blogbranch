# Chrome Web Store API V2 Authentication Fix - COMPLETE SOLUTION

## Problem Summary

Chrome Web Store deployment was failing with **401 Unauthorized** errors when using service account authentication with API V2.

## Root Cause Identified

The **Publisher ID** was incorrectly set to the **project ID** (`blogbranch`) instead of the **project number** (`413467977054`).

### Key Findings from Diagnostic Tool

1. **Publisher ID Format Issue**: 
   - ❌ Current: `blogbranch` (text-based project ID)
   - ✅ Required: `413467977054` (numeric project number)

2. **API Endpoint Error**: 
   - ❌ `/v2/publishers/blogbranch/items` → 404 Not Found
   - ✅ `/v2/publishers/413467977054/items` → Should work

3. **Authentication Working**: 
   - ✅ Service account JWT authentication successful
   - ✅ Access tokens obtained correctly
   - ❌ API calls failing due to wrong publisher ID

## Solution Implementation

### Step 1: Update GitHub Secret

**Action Required**: Update `CHROME_PUBLISHER_ID` secret in GitHub repository:

1. Go to: Repository → Settings → Secrets and variables → Actions
2. Find: `CHROME_PUBLISHER_ID` 
3. Change value from: `blogbranch`
4. Change value to: `413467977054`
5. Save changes

### Step 2: Verify Service Account Setup

Ensure service account is properly configured:

1. **Service Account Email**: `chrome-webstore-deployer@blogbranch.iam.gserviceaccount.com`
2. **Chrome Web Store Developer Dashboard**: Add this email under Account section
3. **Google Cloud Console**: Chrome Web Store API enabled for project `blogbranch`

### Step 3: Test the Fix

After updating the secret:

1. Trigger workflow manually or push changes
2. Check diagnostic tool output:
   - ✅ "Publisher ID format appears correct (numeric)"
   - ✅ API endpoint should return 200 OK instead of 404
   - ✅ Chrome Web Store deployment should succeed

## Files Created for Troubleshooting

1. **`scripts/test-chrome-api.js`** - Comprehensive diagnostic tool
2. **`scripts/test-correct-publisher-id.js`** - Validation test for correct format
3. **`scripts/get-project-info.js`** - Helper to extract project information
4. **`CHROME_WEBSTORE_API_V2_FIX.md`** - Detailed fix documentation

## Technical Details

### Why Project Number vs Project ID?

Chrome Web Store API V2 differs from other Google APIs:
- **Most Google APIs**: Use project ID (`blogbranch`)
- **Chrome Web Store API V2**: Requires project number (`413467977054`)

### API Endpoint Format

```
❌ Wrong: https://chromewebstore.googleapis.com/v2/publishers/blogbranch/items/EXTENSION_ID
✅ Correct: https://chromewebstore.googleapis.com/v2/publishers/413467977054/items/EXTENSION_ID
```

### Authentication Flow

1. ✅ Service account creates JWT correctly
2. ✅ Google Auth Library exchanges JWT for access token
3. ✅ Access token is valid and properly formatted
4. ❌ API calls fail due to incorrect publisher ID in URL
5. ✅ After fix: API calls should succeed

## Expected Results After Fix

1. **Diagnostic Tool**: Shows "Publisher ID format appears correct (numeric)"
2. **API Test**: Returns 200 OK instead of 404 Not Found
3. **Deployment**: Chrome Web Store upload and publish succeed
4. **Workflow**: Store deployment job completes successfully

## Verification Commands

After applying fix, these should work:

```bash
# Test API access
curl -H "Authorization: Bearer $TOKEN" \
     https://chromewebstore.googleapis.com/v2/publishers/413467977054/items

# Should return JSON with extension list, not 404 error
```

## Fallback Plan

If issues persist after fixing publisher ID:

1. **Verify Service Account in Dashboard**: Ensure `chrome-webstore-deployer@blogbranch.iam.gserviceaccount.com` is added
2. **Check API Permissions**: Confirm Chrome Web Store API is enabled
3. **Validate IAM Roles**: Ensure service account has necessary permissions
4. **Use OAuth2 Fallback**: Existing OAuth2 flow with refresh tokens still works

## Success Criteria

- [x] Root cause identified (publisher ID format)
- [x] Correct project number extracted (413467977054)
- [x] Diagnostic tools created and validated
- [x] Fix documented and ready to apply
- [ ] GitHub secret updated with correct value
- [ ] Deployment tested and working
- [ ] Workflow completes successfully

## Next Actions

1. **IMMEDIATE**: Update `CHROME_PUBLISHER_ID` secret to `413467977054`
2. **TEST**: Trigger workflow to validate fix
3. **VERIFY**: Confirm Chrome Web Store deployment succeeds
4. **CLEANUP**: Remove diagnostic tools if no longer needed

---

**Status**: Ready for final fix implementation. The root cause is definitively identified and solution is clear.