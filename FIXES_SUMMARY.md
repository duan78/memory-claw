# Memory Claw v2.4.21 - Fixes and Improvements Summary

## Overview

This document summarizes all the fixes and improvements made to Memory Claw v2.4.21, addressing the three main goals:
1. **Regenerate embeddings for all rows**
2. **Improve capture quality**
3. **Clean raw metadata from content**

---

## CRITICAL BUG FIX (v2.4.21)

### Problem
The `mclaw_store` tool was embedding the **original text** instead of the **cleaned text**, causing a critical search/index mismatch:
- **Stored text**: Cleaned (metadata removed)
- **Embedding vector**: Based on original text (with metadata)
- **Search queries**: Always cleaned before embedding

This meant searches would fail to find stored memories because the embeddings didn't match the stored content.

### Solution
**File**: `src/plugin-entry.ts` (lines 677-679)

**Before**:
```typescript
const vector = await embeddings.embed(text); // Using original text
```

**After**:
```typescript
const vector = await embeddings.embed(normalizedText); // Using cleaned text
```

### Impact
- ✅ All duplicate checks now use cleaned text for consistency
- ✅ Search/index mismatch completely resolved
- ✅ All storage paths (manual, auto-capture, import) now consistent

---

## METADATA CLEANING ENHANCEMENTS (v2.4.21)

### Enhanced `cleanSenderMetadata()` Function

**File**: `src/plugin-entry.ts` (lines 377-447)

The metadata cleaning function now handles:

#### 1. Sender Metadata Blocks
- `Sender (untrusted metadata): ```json...````
- `Conversation info (untrusted metadata): ```json...````
- Supports with/without `json` identifier

#### 2. Timestamp Patterns (Enhanced)
- `[Mon 2026-03-23 15:52 GMT+1]`
- `[2026-03-23 15:52:30]`
- `[03/23/2026 15:52 GMT]`
- `2026-03-23 15:52:30 GMT`

#### 3. System Message Prefixes
- `System:`, `Assistant:`, `User:`, `Tool:`, `Function:`

#### 4. Tool Call Artifacts
- `Tool Call:`, `Function Call:`, `Result:`, `Error:`

#### 5. Additional Headers
- `From:`, `To:`, `Subject:`, `Date:`, `Message-ID:`

#### 6. System Artifacts (v2.4.21 additions)
- `[INST]`, `[/INST]`, `[SYSTEM]`
- `<|...|>` format
- `<instruction>`, `<system>`, `<prompt>` tags

#### 7. JSON Metadata Patterns
- `{ "role": "tool" }`
- `{ "role": "system" }`
- `{ "tool_call_id": ... }`
- `{ "function": ... }`

### Application Points

The cleaning function is now applied in **all storage paths**:

1. **Manual Storage** (`mclaw_store`):
   ```typescript
   const cleanedText = cleanSenderMetadata(text);
   const normalizedText = normalizeText(cleanedText);
   ```

2. **Import** (`mclaw_import`):
   ```typescript
   const cleanedText = cleanSenderMetadata(memo.text);
   ```

3. **Auto-Capture** (`agent_end`/`session_end`):
   ```typescript
   text = cleanSenderMetadata(text);
   ```

---

## CAPTURE QUALITY IMPROVEMENTS

### Configuration Settings

**File**: `src/config.ts`

| Setting | Value | Description |
|---------|-------|-------------|
| `minCaptureImportance` | **0.25** | Lowered from 0.45 for better factual content capture |
| `captureMinChars` | **50** | Minimum text length for capture |
| `captureMaxChars` | **3000** | Maximum text length for capture |

### Importance Calculation (v2.4.0)

**File**: `src/utils/importance.ts`

The importance score (0-1) is calculated based on:

1. **Category Importance**:
   - `entity`: 0.9 (people, contacts, companies)
   - `decision`: 0.85 (decisions made)
   - `preference`: 0.7 (preferences, choices)
   - `technical`: 0.65 (technical config)
   - `seo`: 0.6
   - `workflow`: 0.6
   - `debug`: 0.4
   - `fact`: 0.5

2. **Source Importance**:
   - `manual`: 0.9
   - `agent_end`: 0.7
   - `session_end`: 0.6
   - `auto-capture`: 0.6

3. **Length Bonus**:
   - **Sweet spot**: 50-300 chars → +0.05
   - **Too long**: >1000 chars → -0.1

4. **Keyword Bonuses**:
   - "important", "essential", "crucial" → +0.1
   - "always", "never" → +0.1

5. **Density Bonus**:
   - Proper names, dates, numbers → +0.05

6. **Penalties**:
   - Questions → -0.2
   - Vague expressions ("I think", "maybe") → -0.15

### Content Filtering

**File**: `src/utils/capture.ts`

#### Skip Patterns (Enhanced v2.4.15)
- Memory injection tags (`<relevant-memories>`)
- Sender metadata formats
- Message headers
- JSON metadata blocks (role: tool/system)
- Tool call artifacts

#### Low-Value Patterns
- Single word acknowledgments ("ok", "yes", "thanks")
- Pure questions without factual content
- Temporary/debug queries

#### JSON Metadata Detection
The `isJsonMetadata()` function filters out:
- Pure JSON objects (role: tool/system)
- Tool call results
- System messages

---

## FIX-EMBEDDINGS SCRIPT

**File**: `scripts/fix-embeddings.js`

### Features

1. **Metadata Cleaning**:
   - Applies `cleanSenderMetadata()` to all rows
   - Removes all system artifacts and prefixes

2. **Embedding Regeneration**:
   - Calls Mistral API for each cleaned text
   - Updates database with new embeddings
   - Uses `update()` method with `delete+add` fallback

3. **Safety Features**:
   - `--dry-run`: Preview changes without modifying
   - `--force`: Process all rows (not just broken ones)
   - Retry logic with exponential backoff
   - Progress indicators every 50 rows

4. **Vector Detection**:
   - Enhanced `hasValidVector()` function
   - Handles arrays, Float32Array, and typed arrays
   - Detects null/undefined vectors

### Usage

```bash
# Fix only broken/unclean rows
npm run fix-embeddings

# Regenerate ALL embeddings
npm run fix-embeddings:force

# Preview changes (no modifications)
npm run fix-embeddings:dry-run
```

### Current Database Status

As of v2.4.21, the database is **empty (0 rows)**. This means:
- ✅ No existing embeddings to regenerate
- ✅ Clean state for future captures
- ✅ All new captures will use the fixed logic

---

## EMBEDDING CLIENT IMPROVEMENTS (v2.4.21)

**File**: `src/embeddings.ts`

### Z.AI Endpoint Auto-Correction
- Detects `api.z.ai` baseUrl
- Automatically redirects to `https://api.mistral.ai/v1`
- Prevents 404 errors from Z.AI's `/embeddings` endpoint

### LRU Cache
- 1000 entry max
- 1 hour TTL
- FNV-1a hash for better distribution
- Cache statistics for monitoring

### Vector Dimension Detection
- Auto-detects actual dimension from API response
- Warns on config mismatch
- Properly handles mistral-embed (1024D)

---

## VERIFICATION CHECKLIST

✅ **Critical Bug Fixed**: mclaw_store now embeds cleaned text
✅ **Metadata Cleaning**: Comprehensive patterns across all storage paths
✅ **Capture Quality**: Optimized thresholds and importance calculation
✅ **Fix Script**: Available with --force flag for future needs
✅ **Database**: Empty (clean state for new captures)
✅ **Consistency**: All paths use cleaned text for embeddings

---

## RECOMMENDATIONS

### For Existing Users

1. **If you have existing memories**:
   ```bash
   npm run fix-embeddings:force
   ```
   This will clean metadata and regenerate embeddings for all rows.

2. **Verify configuration**:
   - Check `minCaptureImportance` in your openclaw.json
   - Consider lowering to 0.25 for better capture rate

3. **Monitor capture quality**:
   - Enable `enableStats: true` in config
   - Check logs for capture reasons

### For New Users

1. **No action required**:
   - All fixes are in the codebase
   - New captures will use the correct logic
   - Database starts empty (clean state)

2. **Optional optimizations**:
   - Adjust `minCaptureImportance` (0.25-0.45 range)
   - Tune `captureMinChars` (30-100)
   - Set `enableStats: true` for monitoring

---

## VERSION HISTORY

### v2.4.21 (Current)
- **FIXED**: mclaw_store embedding bug (original vs cleaned text)
- **ENHANCED**: Metadata cleaning with comprehensive patterns
- **IMPROVED**: Vector detection for LanceDB FixedSizeList
- **FIXED**: All storage paths now consistently clean metadata

### v2.4.19
- **FIXED**: Manual storage (mclaw_store) metadata cleaning
- **FIXED**: Import function (mclaw_import) metadata cleaning

### v2.4.17
- **FIXED**: Lowered minCaptureImportance from 0.30 to 0.25
- **FIXED**: Enhanced sender metadata removal

### v2.4.14
- **CRITICAL FIX**: Replaced OpenAI library with native fetch
- **FIXED**: Dimension bug (mistral-embed returns 1024D)

### v2.4.0
- **IMPROVED**: LRU embedding cache
- **IMPROVED**: Tier-aware garbage collection
- **FIXED**: Importance formula (50-300 char sweet spot)

---

## SUPPORT

- **GitHub**: https://github.com/duan78/memory-claw
- **Issues**: Report bugs and feature requests on GitHub
- **Author**: duan78

---

**Document Version**: 2.4.21
**Last Updated**: 2026-03-24
**Status**: ✅ All Fixes Complete
