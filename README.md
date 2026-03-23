# Memory Claw v2.4.5

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
- **Complete**: Full CLI, export/import, GC, statistics

---

## Features

### Hierarchical Memory (v2.3.0)

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
- **Auto-promotion on recall** (v2.4.0): Memories are automatically promoted when frequently accessed

### Performance Optimizations (v2.4.0)

Memory Claw v2.4.0 includes significant performance improvements:

| Feature | Before | After |
|---------|--------|-------|
| **Stats Tracking** | Disk write on every operation | Debounced (30s flush) |
| **Embeddings API** | Call for every request | LRU cache (1000 entries, 1h TTL) |
| **Hit Count Updates** | 1 query + 1 update per memory | Batch updates |
| **Search Results** | Returns full 1024-float vectors | Vectors excluded via `.select()` |
| **Garbage Collection** | All memories treated equally | Core memories protected |

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

### Improved Capture Filtering (v2.3.1)

Smart filtering to avoid capturing noise:
- **Minimum length**: 50 characters (up from 20)
- **Minimum importance**: 0.45 threshold for auto-capture
- **Skip patterns**: Sender metadata, debug logs, temporary queries
- **Pure questions**: Filtered unless they contain factual content

### Dynamic Importance Calculation

Each memory receives a score (0-1) calculated dynamically based on:

- **Category**: entity (0.9), decision (0.85), preference (0.7), technical (0.65), etc.
- **Source**: manual (0.9), agent_end (0.7), session_end (0.6), auto-capture (0.6)
- **Length**: Bonus for concise texts (50-300 characters)
- **Keywords**: Bonus for "important", "essential", "always", "never"
- **Density**: Bonus for proper names, dates, numbers
- **Penalties**: Questions, vague expressions ("I think", "maybe")

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
- **Tier-aware** (v2.4.0):
  - Core memories: **never deleted** (protected)
  - Contextual memories: 2x maxAge, half minHitCount thresholds
  - Episodic memories: normal thresholds
- Initial GC runs 1 minute after startup
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
          "minCaptureImportance": 0.45,
          "recallLimit": 5,
          "recallMinScore": 0.3,
          "enableStats": true,
          "gcInterval": 86400000,
          "gcMaxAge": 2592000000,
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
| `minCaptureImportance` | number | `0.45` | Minimum importance for auto-capture |
| `recallLimit` | number | `5` | Maximum memories recalled |
| `recallMinScore` | number | `0.3` | Minimum similarity score for recall (0-1) |
| `enableStats` | boolean | `true` | Enable statistics and detailed logs |
| `gcInterval` | number | `86400000` | GC interval in ms (default: 24h) |
| `gcMaxAge` | number | `2592000000` | Maximum memory age in ms (default: 30 days) |
| `rateLimitMaxPerHour` | number | `10` | Maximum captures per hour |
| `enableWeightedRecall` | boolean | `true` | Enable weighted scoring for recall |
| `enableDynamicImportance` | boolean | `true` | Enable dynamic importance calculation |

---

## Tools

The plugin registers 8 tools that can be used by the AI agent:

### mclaw_store

Manually store a memo in memory.

**Parameters:**
- `text` (string, required): Text content to store
- `importance` (number, optional): Importance score 0-1 (default: auto-calculated)
- `category` (string, optional): Category (preference, decision, entity, seo, technical, workflow, debug, fact)
- `tier` (string, optional): Memory tier (core, contextual, episodic)

### mclaw_recall

Search stored memories by semantic similarity with weighted scoring.

**Parameters:**
- `query` (string, required): Search query
- `limit` (number, optional): Max results (default: 5)
- `tierFilter` (string[], optional): Filter by tiers (e.g., ["core", "contextual"])

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
- `minImportance` (number, optional): Min importance (default: 0.5)
- `minHitCount` (number, optional): Min hit count (default: 3)

### mclaw_promote (v2.3.0)

Promote a memory to a higher tier (episodic → contextual → core).

**Parameters:**
- `memoryId` (string, required): Memory ID to promote

### mclaw_demote (v2.3.0)

Demote a memory to a lower tier (core → contextual → episodic).

**Parameters:**
- `memoryId` (string, required): Memory ID to demote

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

Memory Claw uses three hooks to integrate with OpenClaw:

1. **before_agent_start**: Injects relevant context before each agent response (tier-based)
2. **agent_end**: Captures facts from successful conversations
3. **session_end**: Recovery hook for crash/kill scenarios

### Tier-Based Injection

Context is injected based on memory tier:

```
★ Core memories → Always injected
◆ Contextual memories → Injected if relevant to current query
○ Episodic memories → Retrieved via semantic search only
```

### Capture Flow

1. User sends message(s)
2. Messages filtered for metadata, debug content, pure questions
3. Checked against trigger patterns (multilingual)
4. Minimum importance threshold (0.45) applied
5. Dynamic importance calculated
6. Tier automatically assigned
7. Memory stored with embeddings

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

### v2.4.5 (Current)
- **Bug Fixes:**
  - Fixed version inconsistencies in plugin comments and log messages (v2.4.2 → v2.4.5)
  - Fixed `skippedLowImportance` counter - now properly tracks content skipped due to low importance
  - Fixed importance threshold - now uses configured `minCaptureImportance` instead of hardcoded 0.3
  - Improved capture logging with detailed breakdown of skip reasons
- **Improvements:**
  - Enhanced LanceDB compaction strategy with better fallback behavior
  - Added `skippedOther` counter for future extensibility

### v2.4.2
- **LanceDB Schema Fix:**
  - Fixed schema inference for empty tags array - use `[""]` instead of `[]` to force string[] type

### v2.4.1
- **OpenClaw Compatibility Fix:**
  - Changed `isMemory: true` to `kind: "memory"` for proper memory slot detection
  - Using `api.pluginConfig` for correct config access (fallback to nested config for backward compatibility)
  - Added root `index.ts` entry point for OpenClaw plugin discovery
  - Updated manifest to point to `index.ts`

### v2.4.0
- **Performance Optimizations:**
  - Debounced stats tracking (30s flush) - no disk I/O per operation
  - LRU embedding cache (1000 entries, 1h TTL) - reduced API calls
  - Batch hit count updates - efficient DB operations
  - Vector exclusion from search results - memory bandwidth savings
- **Features:**
  - Auto-promotion on memory recall
  - Tier-aware GC: core memories protected, contextual lenient thresholds
  - Fixed importance formula (50-300 char sweet spot)
- **Code Quality:**
  - Modular structure (src/ directory)
  - Single entry point: `src/plugin-entry.ts`
  - Reduced code duplication
- **Bug Fixes:**
  - Fixed duplicate entry points causing module resolution errors
  - Added DB migration for `tier` field on existing tables
  - Added `isMemory: true` flag for OpenClaw memory slot detection
  - Removed obsolete build artifacts from repository

### v2.3.1
- Improved capture filtering to reduce noise
- Increased `captureMinChars` from 20 to 50
- Added `minCaptureImportance` threshold (0.45)
- Expanded skip patterns for metadata/debug content
- Filter pure questions without factual content

### v2.3.0
- Hierarchical memory (core/contextual/episodic tiers)
- Tier-based context injection
- 6 new languages: Italian, Portuguese, Russian, Japanese, Korean, Arabic
- New tools: `mclaw_promote`, `mclaw_demote`
- Automatic tier assignment and promotion
- Extended database schema with tier, tags, lastAccessed

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

**Memory Claw v2.4.2 — Your memory, enhanced.**
