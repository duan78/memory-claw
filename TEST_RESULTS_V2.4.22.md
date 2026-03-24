# Memory Claw v2.4.22 - Critical Metadata Cleaning Fix

## Summary

Fixed a critical bug in the metadata cleaning function where inline JSON after "Sender (untrusted metadata):" was not being removed. This caused metadata to be stored in the database and embeddings to be generated from uncleaned text.

## Problem

The `cleanSenderMetadata()` function only matched "Sender (untrusted metadata):" when followed by:
- ```json code blocks
- Empty JSON objects `{}`

But it **didn't match** inline JSON like:
```
Sender (untrusted metadata): {"role":"user","id":"12345"}
The actual content here...
```

## Solution

Added three new regex patterns to `cleanSenderMetadata()`:

### 1. Inline JSON (single line)
```javascript
/^(?:Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*\{[^}]*\}\s*/gim
```
Matches: `Sender (untrusted metadata): {"key":"value"}`

### 2. Multi-line JSON objects
```javascript
/^(?:Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*\{[\s\S]*?\n\}\s*/gim
```
Matches JSON objects spanning multiple lines

### 3. General "Sender:" prefix
```javascript
/^(?:Sender\s*\(untrusted\)|Sender)\s*:\s*.+\n?/gim
```
Matches any "Sender:" or "Sender (untrusted):" followed by text until newline

## Test Results

**Before Fix**: 7/10 tests passed (70% success rate)
**After Fix**: 10/10 tests passed (100% success rate)

### Verified Functionality

✅ Metadata cleaning removes all Sender prefixes
✅ Metadata cleaning removes all timestamp patterns
✅ Metadata cleaning removes JSON metadata blocks
✅ Metadata cleaning removes system prefixes
✅ Clean text passes through unchanged
✅ Embeddings are generated from CLEANED text (not original)
✅ Stored text is cleaned (no metadata in database)
✅ Search works correctly with cleaned queries
✅ Duplicate detection works properly
✅ Vector embeddings are consistent (100% similarity) for cleaned text

## Files Modified

1. **src/plugin-entry.ts** (lines 381-391)
   - Added inline JSON pattern
   - Added multi-line JSON pattern
   - Added general Sender: prefix pattern

2. **scripts/fix-embeddings.js** (lines 66-76)
   - Added same patterns for consistency

3. **test-memory-claw.js**
   - Updated test patterns to match

## Impact

### Critical Fix
- **Search Quality**: Embeddings now match cleaned content, improving search relevance
- **Database Cleanliness**: No metadata stored in database
- **Storage Efficiency**: Cleaner, more focused content

### Backwards Compatibility
- Existing memories with metadata can be fixed using:
  ```bash
  npm run fix-embeddings:force
  ```

## Testing

Run the comprehensive test suite:
```bash
node test-memory-claw.js
```

Expected output:
```
✅ Passed: 10
❌ Failed: 0
Success Rate: 100.0%
```

## Version History

### v2.4.22 (2026-03-24)
- **FIXED**: Inline JSON after "Sender (untrusted metadata):" now properly removed
- **FIXED**: Multi-line JSON objects now properly handled
- **FIXED**: General "Sender:" prefix pattern added
- **TESTED**: All 10 tests passing (100% success rate)

### v2.4.21
- Fixed embedding bug (cleaned vs original text)
- Enhanced metadata cleaning with comprehensive patterns
- Improved capture quality

## Recommendations

### For New Users
- No action required. All new captures will use the fixed logic.

### For Existing Users
1. **If you have existing memories**:
   ```bash
   npm run fix-embeddings:force
   ```
   This will clean metadata and regenerate embeddings for all rows.

2. **Verify the fix**:
   ```bash
   node test-memory-claw.js
   ```

3. **Monitor capture quality**:
   - Check logs for capture reasons
   - Use `mclaw_stats` to monitor database
   - Verify stored content is clean

## Technical Details

### Regex Patterns Explained

#### Pattern 1: Inline JSON
```
/^(?:Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*\{[^}]*\}\s*/gim
```
- `^` - Start of line
- `(?:Sender|Conversation\s*info)` - Non-capturing group for Sender or Conversation info
- `\s*\(untrusted\s*metadata\):` - Literal "(untrusted metadata):"
- `\s*\{[^}]*\}` - Match JSON object (non-greedy)
- `gim` - Global, case-insensitive, multiline flags

#### Pattern 2: Multi-line JSON
```
/^(?:Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*\{[\s\S]*?\n\}\s*/gim
```
- `\{[\s\S]*?\n\}` - Match any character including newlines until `}` on its own line
- Non-greedy (`*?`) to avoid over-matching

#### Pattern 3: General Sender Prefix
```
/^(?:Sender\s*\(untrusted\)|Sender)\s*:\s*.+\n?/gim
```
- `(?:Sender\s*\(untrusted\)|Sender)` - "Sender (untrusted):" or "Sender:"
- `\s*:\s*` - Colon with optional whitespace
- `.+` - Any character until newline
- `\n?` - Optional newline

## Conclusion

This fix ensures that all metadata prefixes are properly removed before storing and embedding, resulting in:
- Cleaner database content
- More accurate search results
- Consistent embeddings for similar content

All tests pass successfully, confirming the fix is working correctly.

---

**Document Version**: 1.0
**Last Updated**: 2026-03-24
**Status**: ✅ All Tests Passing
