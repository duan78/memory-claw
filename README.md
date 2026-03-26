# Memory Claw v2.4.44

**A 100% autonomous multilingual memory plugin for OpenClaw with LanceDB + Mistral Embeddings.**

Memory Claw is an intelligent memory capture and recall system that automatically stores important information from your conversations and makes it available via semantic search. It manages its own database, configuration, and tools—completely independent from OpenClaw's core memory system.

## Overview

Memory Claw exists to solve a fundamental problem: **AI assistants forget everything between conversations**. Each new session starts from scratch, without context or memory from previous exchanges.

This plugin:
- **Automatically captures** important information from your conversations
- **Stores memories** in a local vector database (LanceDB)
- **Organizes memories** into hierarchical tiers (core/contextual/episodic)
- **Recalls relevant context** at the start of each conversation
- **Survives OpenClaw updates** (100% autonomous)

### Why Memory Claw?

Unlike the built-in `memory-lancedb` plugin, Memory Claw is:
- **Autonomous**: Manages its own DB, config, and tools
- **Persistent**: Survives OpenClaw updates without data loss
- **Intelligent**: Dynamic importance scoring, weighted recall, injection detection
- **Multilingual**: Supports 11 languages with automatic detection
- **Hierarchical**: Three-tier memory system (core/contextual/episodic)
- **Robust**: Multiple capture hooks + polling fallback for maximum reliability
- **Complete**: Full CLI, export/import, GC, statistics, compaction

---

## Features

### Hierarchical Memory

Memory Claw organizes memories into three tiers for intelligent context injection:

| Tier | Symbol | Injection | Description |
|------|--------|-----------|-------------|
| **Core** | ★ | Always | Preferences, identity, key decisions (importance ≥ 0.85) |
| **Contextual** | ◆ | If relevant | Session/project context, technical config |
| **Episodic** | ○ | Search only | Temporary events, debug logs, one-time facts |

**Automatic Tier Assignment:**
- `entity` and `decision` categories → Core
- `preference` and `technical` categories → Contextual
- Other categories → Episodic

**Tier Promotion/Demotion:**
- Use `mclaw_promote` to move memory up a tier
- Use `mclaw_demote` to move memory down a tier
- **Auto-promotion on recall**: Memories are automatically promoted when frequently accessed

### Multiple Capture Strategies (v2.4.37+)

Memory Claw uses multiple hooks and a polling fallback to ensure no important information is lost:

**Primary Hooks:**
- `agent_end`: Captures facts from user messages (tries 10 hook name variants)
- `session_end`: Captures facts even on crash/kill
- `llm_output`: Experimental alternative trigger

**Polling Fallback:**
- Reads session files every 30 seconds
- **Aggressive noise filtering** before capture logic
- Handles voice transcripts with metadata blocks
- Preserves actual user content after markers like "[Audio]", "Transcript:", etc.

**Disabled Hooks:**
- `message_sent`: Event structure incompatible (monitored only)

### Performance Optimizations

Memory Claw includes significant performance improvements:

| Feature | Implementation |
|---------|----------------|
| **Stats Tracking** | Debounced (30s flush) - no disk I/O per operation |
| **Embeddings API** | LRU cache (1000 entries, 1h TTL) |
| **Hit Count Updates** | Batch updates |
| **Search Results** | Vectors excluded via `.select()` |
| **Garbage Collection** | Core memories protected, tier-aware thresholds |
| **Database Compaction** | Periodic (6 hours) + manual trigger available |

**Expected Improvements:**
- `before_agent_start` latency reduced by ~50%
- 0 disk I/O per capture (debounced stats)
- Cache hit rate >50% on similar conversations
- Reduced memory bandwidth during search

### Multilingual Support (11 Languages)

Memory Claw supports eleven languages with automatic detection:
- **French (fr)**: Primary language with most complete patterns
- **English (en)**: Full support for English conversations
- **Spanish (es)**: Spanish language patterns
- **German (de)**: German language patterns
- **Chinese (zh)**: Chinese (Simplified + Traditional) / 中文
- **Italian (it)**: Italian language patterns / Italiano
- **Portuguese (pt)**: Portuguese (BR + PT) / Português
- **Russian (ru)**: Russian with Cyrillic / Русский
- **Japanese (ja)**: Japanese (Kanji + Hiragana + Katakana) / 日本語
- **Korean (ko)**: Korean with Hangul / 한국어
- **Arabic (ar)**: Arabic with RTL support / العربية

### Improved Capture Filtering (v2.4.40+)

Smart filtering to avoid capturing noise:
- **Minimum length**: 30 characters (relaxed from 50 for better coverage)
- **Minimum importance**: 0.25 threshold for auto-capture (lowered from 0.45)
- **Skip patterns**: Sender metadata, debug logs, temporary queries
- **Voice-only detection**: Skips empty transcripts
- **Comprehensive noise patterns**: Removes metadata blocks, system messages, compaction artifacts
- **Aggressive filtering**: Applied BEFORE capture logic to handle voice transcripts correctly

### Dynamic Importance Calculation

Each memory receives a score (0-1) calculated dynamically based on:

- **Category**: entity (0.9), decision (0.85), preference (0.7), technical (0.65), etc.
- **Source**: manual (0.9), agent_end (0.7), session_end (0.6), auto-capture (0.6)
- **Length**: Bonus for concise texts (50-300 characters)
- **Keywords**: Bonus for "important", "essential", "always", "never"
- **Density**: Bonus for proper names, dates, numbers
- **Penalties**: Removed question penalty - user questions are valuable context

### Weighted Intelligent Recall

The recall system combines multiple factors for optimal results:

- **Semantic Similarity (60%)**: Vector proximity
- **Importance (30%)**: Memory importance score
- **Recency (10%)**: Age of memory (decays over 90 days)

A diversity penalty is applied to frequently recalled memories to avoid redundancy.

### Prompt Injection Hardening

Advanced protection against prompt injection attacks:
- Detection of injection patterns (multilingual)
- Filtering of system commands (exec, eval, $_GET)
- HTML escaping of injected content
- Suspicion warnings in logs

### Automatic Garbage Collection

- Configurable interval (default: 24 hours)
- **Tier-aware**:
  - Core memories: **never deleted** (protected)
  - Contextual memories: 2x maxAge, half minHitCount thresholds
  - Episodic memories: normal thresholds
- Initial GC runs 10 minutes after startup
- Preserves important or frequently used memories

---

## Installation

### 1. Clone the Plugin

```bash
cd ~/.openclaw/workspace/plugins
git clone https://github.com/duan78/memory-claw.git
cd memory-claw
npm install
```

### 2. Configure OpenClaw

Add to your `openclaw.json` file:

```json
{
  "plugins": {
    "entries": {
      "memory-claw": {
        "config": {
          "enabled": true,
          "embedding": {
            "apiKey": "your-mistral-api-key",
            "model": "mistral-embed",
            "baseUrl": "https://api.mistral.ai/v1",
            "dimensions": 1024
          },
          "dbPath": "~/.openclaw/memory/memory-claw",
          "locales": ["fr", "en", "es", "de", "zh", "it", "pt", "ru", "ja", "ko", "ar"],
          "maxCapturePerTurn": 5,
          "captureMinChars": 50,
          "captureMaxChars": 3000,
          "minCaptureImportance": 0.25,
          "recallLimit": 5,
          "recallMinScore": 0.3,
          "enableStats": true,
          "gcInterval": 86400000,
          "gcMaxAge": 2592000000,
          "gcMinImportance": 0.2,
          "gcMinHitCount": 1,
          "rateLimitMaxPerHour": 10,
          "enableWeightedRecall": true,
          "enableDynamicImportance": true
        }
      }
    }
  }
}
```

### 3. Restart OpenClaw

```bash
openclaw stop
openclaw start
```

---

## Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable or disable the plugin |
| `embedding.apiKey` | string | **required** | Mistral API key (or via `MISTRAL_API_KEY` env var) |
| `embedding.model` | string | `"mistral-embed"` | Embedding model to use |
| `embedding.baseUrl` | string | `"https://api.mistral.ai/v1"` | Base URL for embedding API |
| `embedding.dimensions` | number | `1024` | Vector dimension for embeddings |
| `locales` | string[] | all 11 | Active locales |
| `dbPath` | string | `"~/.openclaw/memory/memory-claw"` | Path to LanceDB database |
| `maxCapturePerTurn` | number | `5` | Maximum memories captured per turn |
| `captureMinChars` | number | `50` | Minimum text length for capture |
| `captureMaxChars` | number | `3000` | Maximum text length for capture |
| `minCaptureImportance` | number | `0.25` | Minimum importance for auto-capture |
| `recallLimit` | number | `5` | Maximum memories recalled |
| `recallMinScore` | number | `0.3` | Minimum similarity score for recall (0-1) |
| `enableStats` | boolean | `true` | Enable statistics and detailed logs |
| `gcInterval` | number | `86400000` | GC interval in ms (default: 24h) |
| `gcMaxAge` | number | `2592000000` | Maximum memory age in ms (default: 30 days) |
| `gcMinImportance` | number | `0.2` | Minimum importance for GC deletion |
| `gcMinHitCount` | number | `1` | Minimum hit count for GC deletion |
| `rateLimitMaxPerHour` | number | `10` | Maximum captures per hour |
| `enableWeightedRecall` | boolean | `true` | Enable weighted scoring for recall |
| `enableDynamicImportance` | boolean | `true` | Enable dynamic importance calculation |

---

## Tools

The plugin registers 10 tools that can be used by the AI agent:

### mclaw_store

Manually store a memo in memory.

**Parameters:**
- `text` (string, required): Text content to store
- `importance` (number, optional): Importance score 0-1 (default: auto-calculated)
- `category` (string, optional): Category (preference, decision, entity, seo, technical, workflow, debug, fact)

### mclaw_recall

Search stored memories by semantic similarity with weighted scoring.

**Parameters:**
- `query` (string, required): Search query
- `limit` (number, optional): Max results (default: 5)

### mclaw_forget

Delete a stored memory by ID or by query.

**Parameters:**
- `memoryId` (string, optional): Specific memory ID to delete
- `query` (string, optional): Query to find memories to delete

### mclaw_export

Export all stored memories to a JSON file for backup.

**Parameters:**
- `filePath` (string, optional): Custom file path (default: auto-generated)

### mclaw_import

Import memories from a JSON file.

**Parameters:**
- `filePath` (string, required): Path to the JSON file to import

### mclaw_gc

Run garbage collection to remove old, low-importance memories.

**Parameters:**
- `maxAge` (number, optional): Max age in ms (default: 30 days)
- `minImportance` (number, optional): Min importance (default: 0.2)
- `minHitCount` (number, optional): Min hit count (default: 1)

### mclaw_promote

Promote a memory to a higher tier (episodic → contextual → core).

**Parameters:**
- `memoryId` (string, required): Memory ID to promote

### mclaw_demote

Demote a memory to a lower tier (core → contextual → episodic).

**Parameters:**
- `memoryId` (string, required): Memory ID to demote

### mclaw_stats

Get database statistics including memory count, estimated size, and optional embedding cache stats.

**Parameters:**
- `includeEmbeddings` (boolean, optional): Include embedding cache stats

### mclaw_compact

Manually trigger database compaction to reduce transaction file bloat.

---

## CLI Commands

### openclaw memory-claw list

List stored memories with optional filtering.

**Options:**
- `--category`: Filter by category
- `--tier`: Filter by tier (core, contextual, episodic)
- `--limit`: Max results (default: 20)
- `--json`: Output as JSON

### openclaw memory-claw search \<query\>

Search memories by semantic similarity.

**Options:**
- `--limit`: Max results (default: 10)

### openclaw memory-claw stats

Display memory statistics.

### openclaw memory-claw export [path]

Export memories to a JSON file.

### openclaw memory-claw gc

Run garbage collection.

### openclaw memory-claw clear

Delete all stored memories (requires confirmation).

---

## How It Works

### Architecture

Memory Claw uses multiple hooks and polling to integrate with OpenClaw:

1. **before_agent_start**: Injects relevant context before each agent response (tier-based)
2. **agent_end**: Captures facts from successful conversations (tries 10 hook name variants)
3. **session_end**: Recovery hook for crash/kill scenarios
4. **llm_output**: Experimental alternative trigger
5. **Polling fallback**: Reads session files every 30 seconds with aggressive noise filtering

### Tier-Based Injection

Context is injected based on memory tier:

```
★ Core memories → Always injected
◆ Contextual memories → Injected if relevant to current query
○ Episodic memories → Retrieved via semantic search only
```

### Capture Flow

1. Multiple hooks trigger on conversation events
2. Messages grouped by consecutive user messages
3. **Aggressive noise filtering** removes metadata blocks before capture logic
4. Checked against trigger patterns (multilingual)
5. Minimum importance threshold (0.25) applied
6. Dynamic importance calculated
7. Tier automatically assigned
8. Memory stored with embeddings

### Polling Fallback

When hooks don't fire reliably:
1. Reads latest session file every 30 seconds
2. Parses JSONL format messages
3. **Aggressive noise filtering** before capture logic
4. Handles voice transcripts with metadata blocks
5. Preserves user content after markers like "[Audio]", "Transcript:"
6. Processes only new messages since last check
7. State persists across plugin reloads

---

## Database Schema

Memory Claw uses an extended schema in LanceDB:

```typescript
{
  id: string;           // UUID unique identifier
  text: string;         // Memory text content
  vector: number[];     // Mistral embedding (1024 dimensions)
  importance: number;   // Score 0-1 (dynamically calculated)
  category: string;     // Category (preference, decision, etc.)
  tier: string;         // Memory tier (core, contextual, episodic)
  tags: string[];       // Optional tags
  createdAt: number;    // Creation timestamp
  updatedAt: number;    // Last update timestamp
  lastAccessed: number; // Last recall timestamp
  source: string;       // Source (manual, agent_end, session_end, auto-capture)
  hitCount: number;     // Number of times recalled
}
```

**Table Name:** `memories_claw`

---

## Categories

Memories are automatically categorized into 8 types:

| Category | Importance | Default Tier | Description |
|----------|------------|--------------|-------------|
| `entity` | 0.9 | core | People, contacts, companies |
| `decision` | 0.85 | core | Decisions made |
| `preference` | 0.7 | contextual | Preferences, choices |
| `technical` | 0.65 | contextual | Technical config, infrastructure |
| `seo` | 0.6 | episodic | SEO, marketing, content |
| `workflow` | 0.6 | episodic | Processes, methods |
| `debug` | 0.4 | episodic | Errors, bugs |
| `fact` | 0.5 | episodic | General facts |

---

## Changelog

### v2.4.44 (Current)
- **CRITICAL FIX - Aggressive Noise Filtering:**
  - FIXED: Noise patterns now remove metadata blocks BEFORE capture logic
  - FIXED: Patterns properly handle voice transcripts with metadata blocks before actual user content
  - FIXED: Preserve actual user content that comes after "[Audio]", "[Voice", "User text:", "Transcript:" markers
  - FIXED: All noise filtering happens in convertJsonlToMessages BEFORE processMessages/shouldCapture
  - FIXED: Messages like "[Audio] User text: [...] Transcript: Ok, est-ce qu'on peut vérifier..." now captured correctly

### v2.4.43
- **CAPTURE PIPELINE FIXES:**
  - FIXED: agent_end hook now tries 10 different hook name variants
  - FIXED: Enhanced event structure detection - tries multiple patterns
  - FIXED: Added lastFiredAt timestamp to hook tracking for better diagnostics
  - FIXED: message_sent hook now uses debouncing (1-second batch window) to prevent buffer/queue overflow
  - FIXED: Improved error handling for all hooks with more detailed logging

### v2.4.42
- **CAPTURE PIPELINE FIXES:**
  - FIXED: agent_end hook uses separate closures for each hook name
  - FIXED: Enhanced hook tracking with per-hook statistics
  - FIXED: message_sent counter uses modulo reset to prevent integer overflow
  - FIXED: Relaxed capture filter - captures ALL user messages > 30 chars
  - FIXED: Removed question penalty - user questions are valuable context
  - FIXED: For user messages: bypass importance threshold

### v2.4.41
- **CAPTURE PIPELINE FIXES:**
  - FIXED: agent_end hook tries multiple hook names
  - FIXED: Added hook firing tracking to diagnose which hooks fire
  - FIXED: message_sent hook uses rate-limited logging to prevent buffer overflow
  - FIXED: Periodic health check logs when agent_end hook never fires

### v2.4.40
- **ENHANCED CAPTURE FILTERING:**
  - FIXED: Comprehensive noise pattern filtering
  - FIXED: Voice-only message detection
  - FIXED: Lowered deduplication threshold from 0.85 to 0.70
  - FIXED: Filters: metadata blocks, system messages, compaction artifacts
  - FIXED: Improved content quality scoring

### v2.4.39
- FIXED: Duplicate tracking with persistent state file that survives plugin reloads

### v2.4.38
- Added: JSONL format conversion for session file processing

### v2.4.37
- **CAPTURE PIPELINE OVERHAUL:**
  - FIXED: Broken hooks, added polling fallback
  - FIXED: Reads session files every 30 seconds with aggressive noise filtering

### v2.4.28
- FIXED: Added gcMinImportance (0.2) and gcMinHitCount (1) to DEFAULT_CONFIG
- FIXED: GC thresholds now match capture thresholds to prevent memory loss

### v2.4.9
- **CRITICAL BUG FIXES:**
  - FIXED: Corrected mistral-embed vector dimension (256 not 1024)
  - FIXED: Updated dimension detection logic for all embedding models

### v2.4.5
- FIXED: Version inconsistencies in plugin comments
- FIXED: `skippedLowImportance` counter tracking
- FIXED: Importance threshold uses configured `minCaptureImportance`

### v2.4.2
- FIXED: LanceDB Schema - schema inference for empty tags array

### v2.4.1
- FIXED: OpenClaw Compatibility - using `kind: "memory"` for proper detection
- FIXED: Added root `index.ts` entry point

### v2.4.0
- **Performance Optimizations:**
  - Debounced stats tracking (30s flush)
  - LRU embedding cache (1000 entries, 1h TTL)
  - Batch hit count updates
  - Vector exclusion from search results
- **Features:**
  - Auto-promotion on memory recall
  - Tier-aware GC
  - Fixed importance formula
- **Code Quality:**
  - Modular structure (src/ directory)
  - Single entry point: `src/plugin-entry.ts`

### v2.3.1
- Improved capture filtering to reduce noise
- Increased `captureMinChars` from 20 to 50
- Added `minCaptureImportance` threshold (0.45)

### v2.3.0
- Hierarchical memory (core/contextual/episodic tiers)
- Tier-based context injection
- 6 new languages: Italian, Portuguese, Russian, Japanese, Korean, Arabic
- New tools: `mclaw_promote`, `mclaw_demote`

### v2.2.0
- Multilingual support (French, English, Spanish, German, Chinese)
- Automatic language detection
- Renamed from memory-french to memory-claw

### v2.1.0
- Dynamic importance calculation
- Weighted recall (similarity + importance + recency)
- Rate limiting
- CLI commands

### v2.0.0
- 100% autonomous plugin
- Extended database schema
- Export/import JSON
- Garbage collection

---

## Repository

- **GitHub**: https://github.com/duan78/memory-claw
- **Issues**: Report bugs and feature requests on GitHub
- **Author**: duan78

---

## License

ISC

---

**Memory Claw v2.4.44 — Your memory, enhanced.**
