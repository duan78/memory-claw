# Memory-Claw v2.4.18 - Improvements Summary

## Overview

This update enhances the metadata cleaning capabilities and improves the fix-embeddings script to make it easier to regenerate embeddings for all rows in the database.

## Changes Made

### 1. Enhanced Metadata Cleaning (src/plugin-entry.ts)

**Added comprehensive patterns to `cleanSenderMetadata()` function:**

- **Additional timestamp formats:**
  - `[2026-03-23 15:52:30]` (ISO format)
  - `[03/23/2026 15:52 GMT]` (US format with timezone)
  - `2026-03-23 15:52:30 GMT` (Plain text format)

- **System message prefixes:**
  - `System:`, `Assistant:`, `User:`, `Tool:`, `Function:`

- **Tool call artifacts:**
  - `Tool Call:`, `Function Call:`, `Result:`, `Error:`

- **Email/message metadata headers:**
  - `From:`, `To:`, `Subject:`, `Date:`, `Message-ID:`

- **Empty metadata objects:** `{}`

**Impact**: Cleaner content for embedding generation, resulting in better semantic search quality.

### 2. Improved fix-embeddings.js Script

**Complete rewrite with new features:**

- **`--force` flag**: Regenerate ALL embeddings (not just broken ones)
- **`--dry-run` flag**: Preview changes without making them
- **Retry logic**: 3 attempts with exponential backoff (200ms → 400ms → 800ms)
- **Progress indicators**: Detailed logging every 50 rows
- **Enhanced summary**: Timing, counts, and error reporting
- **Better error handling**: Non-zero exit code on errors
- **Enhanced metadata cleaning**: Uses same patterns as main plugin

**Usage examples:**

```bash
# Fix only broken/unclean rows
node scripts/fix-embeddings.js

# Regenerate ALL embeddings
node scripts/fix-embeddings.js --force

# Preview what would be done
node scripts/fix-embeddings.js --dry-run

# Force regeneration with dry run preview
node scripts/fix-embeddings.js --force --dry-run
```

### 3. Version Updates

Updated to v2.4.18:
- `package.json`: 2.4.18
- `src/plugin-entry.ts`: @version 2.4.18
- `src/embeddings.ts`: @version 2.4.18
- `FIXES_SUMMARY.md`: Added v2.4.18 section

## How to Use

### For New Captures

The enhanced metadata cleaning is now active for all new captures. No action needed.

### To Fix/Regenerate Existing Embeddings

1. **First, preview what would be done:**
   ```bash
   node scripts/fix-embeddings.js --dry-run
   ```

2. **Fix only broken/unclean rows:**
   ```bash
   export MISTRAL_API_KEY="your-api-key"
   node scripts/fix-embeddings.js
   ```

3. **Regenerate ALL embeddings (force mode):**
   ```bash
   export MISTRAL_API_KEY="your-api-key"
   node scripts/fix-embeddings.js --force
   ```

## Benefits

1. **Cleaner Content**: More comprehensive metadata removal results in better embedding quality
2. **Better Search**: Cleaner embeddings improve semantic search accuracy
3. **Easier Maintenance**: New script features make it easier to regenerate embeddings when needed
4. **Better Visibility**: Progress indicators and dry-run mode give more control
5. **More Robust**: Retry logic reduces failures from temporary API issues

## Testing

All TypeScript type checking passed successfully:
```bash
npx tsc --noEmit
```

No errors found.

## Next Steps

1. Test the enhanced metadata cleaning with new captures
2. Run the fix-embeddings script in dry-run mode to preview changes
3. Run the script to fix/regenerate embeddings as needed
4. Monitor capture quality and search results

## Files Modified

1. `src/plugin-entry.ts` - Enhanced `cleanSenderMetadata()` function
2. `scripts/fix-embeddings.js` - Complete rewrite with new features
3. `src/embeddings.ts` - Version update
4. `package.json` - Version update
5. `FIXES_SUMMARY.md` - Added v2.4.18 documentation
