# Memory Claw v2.4.19 - Changes Summary

## Overview
Fixed critical bugs where metadata cleaning was not applied consistently across all storage paths, and ensured all stored memories are properly cleaned of metadata prefixes.

## Changes Made

### 1. Fixed Manual Storage Metadata Cleaning (plugin-entry.ts)
- **Issue**: The `mclaw_store` tool was not cleaning metadata from manually stored text
- **Fix**: Added `cleanSenderMetadata()` call before normalizing text in mclaw_store tool
- **Impact**: All manually stored memories will now have metadata removed before storage

### 2. Fixed Import Metadata Cleaning (plugin-entry.ts)
- **Issue**: The `mclaw_import` tool was not cleaning metadata from imported memories
- **Fix**: Added `cleanSenderMetadata()` call before embedding imported text
- **Impact**: All imported memories will now have metadata removed before storage

### 3. Version Updates
- Updated version from 2.4.18 to 2.4.19 in:
  - `package.json`
  - `src/plugin-entry.ts`
  - `src/embeddings.ts`
  - `src/utils/capture.ts`

### 4. Added NPM Scripts (package.json)
- Added convenient scripts for running fix-embeddings:
  - `npm run fix-embeddings` - Fix only broken/unclean rows
  - `npm run fix-embeddings:force` - Regenerate ALL embeddings
  - `npm run fix-embeddings:dry-run` - Show what would be done without making changes

## Metadata Cleaning Patterns

The `cleanSenderMetadata()` function removes:
- Sender metadata prefixes: "Sender (untrusted metadata)"
- Timestamp patterns: [2026-03-23 15:52:30], [Mon 2026-03-23 15:52 GMT+1]
- System message prefixes: System:, Assistant:, User:, Tool:, Function:
- Tool call artifacts: Tool Call:, Function Call:, Result:, Error:
- Email headers: From:, To:, Subject:, Date:, Message-ID:
- Empty metadata objects: {}

## Existing Features Maintained

### Fix-Embeddings Script (scripts/fix-embeddings.js)
- Already exists with comprehensive features:
  - `--force` flag to regenerate ALL embeddings
  - `--dry-run` flag to preview changes
  - Retry logic for API calls
  - Progress indicators
  - Enhanced metadata cleaning

### Capture Quality
- Current threshold: 0.25 (lowered from 0.45 in v2.4.17)
- This threshold provides a good balance between capturing important content and avoiding noise

## How to Use

### Fix Existing Memories with Bad Embeddings
```bash
# Preview what would be changed (recommended first step)
npm run fix-embeddings:dry-run

# Fix only broken/unclean rows
npm run fix-embeddings

# Force regenerate ALL embeddings (use with caution)
npm run fix-embeddings:force
```

### Clean All Existing Memories
If you have memories with metadata prefixes that weren't cleaned before:
1. First run dry-run to see what would change: `npm run fix-embeddings:dry-run`
2. If satisfied, run: `npm run fix-embeddings`
3. For all rows (even those with valid embeddings): `npm run fix-embeddings:force`

## Testing
After upgrading to v2.4.19:
1. Test manual storage: Use mclaw_store tool and verify metadata is removed
2. Test import: Use mclaw_import tool and verify metadata is removed
3. Verify auto-capture still works (already had metadata cleaning)

## Migration Notes
- No database migration needed
- Existing memories will remain as-is until you run fix-embeddings
- New memories (manual, import, or auto-capture) will be cleaned automatically
- To clean existing memories, run the fix-embeddings script

## Related Files
- `src/plugin-entry.ts` - Main plugin entry point
- `src/embeddings.ts` - Embedding client
- `src/utils/capture.ts` - Capture utilities
- `src/utils/text.ts` - Text processing utilities
- `scripts/fix-embeddings.js` - Fix script for existing memories
