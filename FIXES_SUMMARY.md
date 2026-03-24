# Memory-Claw Plugin Fixes - v2.4.17

## Summary

Fixed critical issues in the memory-claw plugin that were causing poor data quality and low capture rates.

## Problems Fixed

### 1. Missing Embeddings (All 10 rows had no vectors)
**Root Cause**: The content extraction was working, but the "Sender (untrusted metadata)" prefix was being included in the text, which would have been embedded. However, the embeddings require a valid API key.

**Fix Applied**: Added `cleanSenderMetadata()` function that removes:
- `Sender (untrusted metadata): { }` prefixes
- `Conversation info (untrusted metadata): { }` prefixes
- Timestamp prefixes like `[Mon 2026-03-23 15:52 GMT+1]`

**Location**: `src/plugin-entry.ts` - Enhanced `groupConsecutiveUserMessages()` function

### 2. Raw Metadata in Content (Garbage Data)
**Example**: `"Sender (untrusted metadata): { } [Mon 2026-03-23 15:52 GMT+1] avant de restart, je souhaite qu'on configure..."`

**Root Cause**: The message content extraction was pulling the entire message including system metadata headers.

**Fix Applied**:
1. Added `cleanSenderMetadata()` function to strip metadata prefixes
2. Applied cleaning in `groupConsecutiveUserMessages()` after content extraction
3. Ensured cleaning happens AFTER JSON filtering

**Location**: `src/plugin-entry.ts` lines 313-337

### 3. Low Capture Rate (26 captures over many hours)
**Root Cause**: The `minCaptureImportance` threshold was set to 0.45 (config) and 0.30 (code default), which is too high for factual content that doesn't contain trigger words.

**Fix Applied**: Lowered threshold consistently to 0.25:
- `src/config.ts`: `minCaptureImportance: 0.25` (was 0.45)
- `src/utils/capture.ts`: default parameter `0.25` (was 0.30)
- `src/plugin-entry.ts`: all references updated to `0.25`

**Impact**: Factual statements without trigger words will now be captured more reliably.

### 4. Version Consistency
**Fix Applied**: Updated all version references to v2.4.17:
- `package.json`: `2.4.17`
- `src/plugin-entry.ts`: `@version 2.4.17`
- `src/embeddings.ts`: `@version 2.4.17`
- `src/utils/capture.ts`: `@version 2.4.17`

## Files Modified

1. **src/plugin-entry.ts** - Main fixes:
   - Added `cleanSenderMetadata()` function
   - Enhanced `groupConsecutiveUserMessages()` to call cleaner
   - Updated all `minCaptureImportance` references
   - Updated version header to 2.4.17

2. **src/config.ts** - Configuration fix:
   - Changed `minCaptureImportance` from 0.45 to 0.25

3. **src/utils/capture.ts** - Capture threshold fix:
   - Changed default `minImportance` parameter from 0.30 to 0.25
   - Updated version header

4. **src/embeddings.ts** - Version update:
   - Updated version header to 2.4.17

5. **package.json** - Version update:
   - Updated version from 2.4.16 to 2.4.17

## Database Cleanup

A script has been provided to fix the existing bad rows: **scripts/fix-embeddings.js**

**What the script does**:
1. Reads all existing rows from the database
2. For each row with missing/invalid vectors or dirty content:
   - Cleans the sender metadata from the text
   - Generates a new embedding using Mistral API
   - Deletes the old row and inserts the fixed one
3. Provides detailed progress logging

**How to run** (requires MISTRAL_API_KEY):
```bash
cd /root/.openclaw/workspace/plugins/memory-claw
export MISTRAL_API_KEY="your-api-key-here"
node scripts/fix-embeddings.js
```

**Note**: The API key must be set. Without it, the script will fail to generate embeddings.

## Testing Recommendations

1. **Verify new captures are clean**:
   - Send test messages and check they don't start with "Sender (untrusted metadata)"
   - Check that embeddings are being generated (vectors have proper dimensions)

2. **Verify capture rate improvement**:
   - Monitor the number of captures over time
   - Verify factual content without trigger words is being captured

3. **Run database cleanup** (requires API key):
   - Run the fix-embeddings.js script to clean existing rows
   - Verify all 10 rows now have valid vectors
   - Verify text content is clean (no sender prefixes)

## Expected Results

After applying these fixes:

1. **New captures** will have clean text content (no sender metadata prefixes)
2. **New captures** will have valid embeddings (assuming API key is configured)
3. **Capture rate** will increase due to lower importance threshold (0.25)
4. **Existing rows** can be fixed with the provided script (requires API key)

## Next Steps

1. Set up the MISTRAL_API_KEY environment variable or configure it in the plugin
2. Run the fix-embeddings.js script to clean existing data
3. Monitor new captures to verify they're working correctly
4. Test the `mclaw_recall` tool to verify semantic search is working

## Technical Details

### Content Extraction Flow (Fixed)

Before (v2.4.16):
```
User Message → Extract Content → Filter JSON → Store
                (includes metadata)
```

After (v2.4.17):
```
User Message → Extract Content → Filter JSON → Clean Metadata → Store
                (includes metadata)                     (NEW)
```

### Importance Threshold Changes

Before:
- Config default: 0.45
- Code default: 0.30
- Inconsistent across codebase

After (v2.4.17):
- Config default: 0.25
- Code default: 0.25
- Consistent across all references

### Metadata Cleaning Patterns

The following patterns are now stripped from content:
- `Sender (untrusted metadata): { }` (case-insensitive)
- `Conversation info (untrusted metadata): { }` (case-insensitive)
- `[Day YYYY-MM-DD HH:MM TZ]` timestamps
