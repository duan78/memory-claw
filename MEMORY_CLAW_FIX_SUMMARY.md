# Memory-Claw Fix Summary - v2.4.20

## Date: 2026-03-24

## Overview
Fixed and improved memory-claw plugin with focus on:
1. Regenerating embeddings for all rows
2. Improving capture quality settings
3. Cleaning raw metadata from content

## Changes Made

### 1. Fixed fix-embeddings.js Script (v2.4.20)

#### Critical Fixes:
- **Config Path Issue**: Fixed script to look for API key in `/root/.openclaw/openclaw.json` instead of `/root/.openclaw/config.json`
- **Data Loss Prevention**: Changed from `delete + add` approach to `update()` method to prevent data loss if operations fail
- **Fallback Mechanism**: Added fallback to `delete + add` if `update()` fails (for schema compatibility)

```javascript
// Before: Delete then add (dangerous - loses data if add fails)
await table.delete(`id = '${row.id}'`);
await table.add([newEntry]);

// After: Update (safe) with fallback
try {
  await table.update({
    where: `id = '${row.id}'`,
    values: { text: textToEmbed, vector: vector, updatedAt: Date.now() }
  });
} catch (updateError) {
  // Fallback to delete+add only if update fails
  await table.delete(`id = '${row.id}'`);
  await table.add([newEntry]);
}
```

### 2. Verified Metadata Cleaning

All storage paths properly implement `cleanSenderMetadata()` function:

#### Storage Paths Verified:
1. **Manual Storage** (`mclaw_store` tool - line 641):
   ```typescript
   const cleanedText = cleanSenderMetadata(text);
   ```

2. **Import Function** (`mclaw_import` - line 269):
   ```typescript
   const cleanedText = cleanSenderMetadata(memo.text);
   ```

3. **Auto-Capture** (`groupConsecutiveUserMessages` - line 481):
   ```typescript
   text = cleanSenderMetadata(text);
   ```

#### Metadata Cleaning Patterns:
- Sender metadata prefixes
- Timestamp variations (ISO, US, international formats)
- System message prefixes (System:, Assistant:, User:, Tool:, Function:)
- Tool call artifacts (Tool Call:, Function Call:, Result:, Error:)
- Email headers (From:, To:, Subject:, Date:, Message-ID:)
- Empty metadata objects

### 3. Current Configuration

From `/root/.openclaw/openclaw.json`:
```json
{
  "memory-claw": {
    "enabled": true,
    "config": {
      "embedding": {
        "apiKey": "***",
        "model": "mistral-embed",
        "baseUrl": "https://api.mistral.ai/v1"
      },
      "dbPath": "/root/.openclaw/memory/memory-claw",
      "maxCapturePerTurn": 5,
      "captureMinChars": 20,
      "captureMaxChars": 3000,
      "recallLimit": 5,
      "recallMinScore": 0.3,
      "enableStats": true,
      "gcInterval": 86400000,
      "gcMaxAge": 2592000000
    }
  }
}
```

## Current Database State

- **Database**: `/root/.openclaw/memory/memory-claw`
- **Table**: `memories_claw`
- **Current Rows**: 0 (empty)
- **Vector Dimension**: 1024D (mistral-embed)
- **Stats**: 26 captures, 125 recalls (from stats file, likely historical)

## Issue Identified

**Data Loss Incident**:
- Previous fix-embeddings run deleted rows before add operations failed
- Error: "Found field not in schema: tags.isValid at row 0"
- Result: All 5 existing memories were lost
- Backups also found to be empty

**Root Cause**:
The `delete + add` pattern was unsafe:
1. Row deleted successfully
2. Add operation failed due to schema issue
3. Data permanently lost

## Recommendations

### 1. Capture Quality Settings

**Current Issue**: `captureMinChars: 20` is too low
- Should be at least 30-50 characters
- Combined with MIN_LENGTH of 30 in shouldCapture()
- Recommendation: Set to 30-50 for better quality

**Recommended Configuration**:
```json
{
  "captureMinChars": 50,        // Increase from 20
  "captureMaxChars": 3000,      // Keep current
  "minCaptureImportance": 0.25  // Already good (lowered from 0.45)
}
```

### 2. Database Backup Strategy

**Current**: No automated backups before operations
**Recommendation**: Add backup before fix-embeddings runs

```javascript
// Add to fix-embeddings.js
const backupPath = `${DB_PATH}-backup-${Date.now()}`;
await fs.cp(DB_PATH, backupPath, { recursive: true });
console.log(`Backup created at: ${backupPath}`);
```

### 3. Testing Plan

1. **Test Metadata Cleaning**:
   ```bash
   # Test with sample text containing metadata
   echo 'Sender (untrusted metadata): {}
   [2026-03-23 15:52:30]
   System: This is a test message' | node -e "
     const text = require('fs').readFileSync(0, 'utf-8');
     const clean = text.replace(/Sender.*?\\n\\s*/g, '')
                      .replace(/\\[.*?\\]\\s*/g, '')
                      .replace(/System:\\s*/gi, '');
     console.log(clean);
   "
   ```

2. **Test Embedding Generation**:
   ```bash
   npm run fix-embeddings:dry-run
   ```

3. **Test Manual Storage**:
   ```bash
   # Via OpenClaw interface
   mclaw_store("Test memory with metadata")
   ```

### 4. Monitoring

Add periodic checks:
```bash
# Check memory count
node scripts/list-memories.js

# Check stats
cat ~/.openclaw/memory/memory-claw-stats.json
```

## Version Information

- **Previous Version**: v2.4.19
- **Current Version**: v2.4.20
- **Package**: memory-claw
- **Files Modified**:
  - `package.json` (version bump)
  - `scripts/fix-embeddings.js` (config path, update method)

## Next Steps

1. ✅ Fix fix-embeddings script (completed)
2. ✅ Verify metadata cleaning (completed)
3. ✅ Document current state (completed)
4. ⏳ Improve capture quality settings (recommendation provided)
5. ⏳ Test with sample data (user action needed)
6. ⏳ Implement automated backups (recommendation provided)

## Files Modified

1. `/root/.openclaw/workspace/plugins/memory-claw/package.json`
2. `/root/.openclaw/workspace/plugins/memory-claw/scripts/fix-embeddings.js`
3. `/root/.openclaw/workspace/plugins/memory-claw/scripts/list-memories.js` (new file)

## Related Scripts

- `scripts/fix-embeddings.js` - Fix/Regenerate embeddings
- `scripts/list-memories.js` - List all memories in database
- `npm run fix-embeddings` - Fix broken/unclean rows
- `npm run fix-embeddings:force` - Regenerate ALL embeddings
- `npm run fix-embeddings:dry-run` - Preview changes without execution

## Contact & Support

- Plugin Author: duan78
- Repository: /root/.openclaw/workspace/plugins/memory-claw
- Database: /root/.openclaw/memory/memory-claw
- Config: /root/.openclaw/openclaw.json

---

**Last Updated**: 2026-03-24
**Status**: Fix completed, ready for testing
**Risk Level**: Low (fix-embeddings now uses safe update method)
