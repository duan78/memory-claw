# Memory Claw v2.2.0

**A 100% autonomous multilingual memory plugin for OpenClaw with LanceDB + Mistral Embeddings.**

Memory Claw is an intelligent memory capture and recall system that automatically stores important information from your conversations and makes it available via semantic search. It manages its own database, configuration, and tools—completely independent from OpenClaw's core memory system.

## Overview

Memory Claw exists to solve a fundamental problem: **AI assistants forget everything between conversations**. Each new session starts from scratch, without context or memory from previous exchanges.

This plugin:
- **Automatically captures** important information from your conversations
- **Stores memories** in a local vector database (LanceDB)
- **Recalls relevant context** at the start of each conversation
- **Survives OpenClaw updates** (100% autonomous)

### Why Memory Claw?

Unlike the built-in `memory-lancedb` plugin, Memory Claw is:
- **Autonomous**: Manages its own DB, config, and tools
- **Persistent**: Survives OpenClaw updates without data loss
- **Intelligent**: Dynamic importance scoring, weighted recall, injection detection
- **Multilingual**: Supports French, English, Spanish, and German
- **Complete**: Full CLI, export/import, GC, statistics

---

## Features

### Multilingual Support (v2.2.0)

Memory Claw supports four languages with automatic detection:
- **French (fr)**: Primary language with most complete patterns
- **English (en)**: Full support for English conversations
- **Spanish (es)**: Spanish language patterns
- **German (de)**: German language patterns

The plugin automatically detects the language of each message and applies the appropriate patterns for capture and categorization. Configure active locales using the `locales` parameter in your config.

### Dynamic Importance Calculation

Each memory receives a score (0-1) calculated dynamically based on:

- **Category**: entity (0.9), decision (0.85), preference (0.7), technical (0.65), etc.
- **Source**: manual (0.9), agent_end (0.7), session_end (0.6), auto-capture (0.6)
- **Length**: Bonus for concise texts (20-200 characters)
- **Keywords**: Bonus for "important", "essential", "always", "never"
- **Density**: Bonus for proper names, dates, numbers
- **Penalties**: Questions, vague expressions ("I think", "maybe")

### Weighted Intelligent Recall

The recall system combines three factors for optimal results:

- **Semantic Similarity (60%)**: Vector proximity
- **Importance (30%)**: Memory importance score
- **Recency (10%)**: Age of memory (decays over 90 days)

A diversity penalty is applied to frequently recalled memories to avoid redundancy.

### Multi-Message Context Capture

Consecutive user messages are intelligently grouped:
- Semantic similarity detection between messages
- Groups messages sharing >30% significant words
- Captures complete context instead of fragments

### Prompt Injection Hardening

Advanced protection against prompt injection attacks:
- Detection of injection patterns (French + English)
- Filtering of system commands (exec, eval, $_GET)
- HTML escaping of injected content
- Suspicion warnings in logs

### Rate Limiting

Protection against overload:
- Configurable limit (default: 10 captures/hour)
- High-importance memories (>0.8) bypass limits
- Real-time tracking via CLI

### Automatic Garbage Collection

- Configurable interval (default: 24 hours)
- Deletes memories: age >30 days + importance <0.5 + hitCount <3
- Initial GC runs 1 minute after startup
- Preserves important or frequently used memories

### Persistent Statistics

- Tracks captures, recalls, and errors
- Persisted in `~/.openclaw/memory/memory-claw-stats.json`
- Survives restarts
- Logged every 5 minutes during activity

### Export/Import JSON

- Full export with metadata
- Smart import with deduplication
- Versioned format for future compatibility

### Migration from memory-lancedb

- Automatic migration from `memory-lancedb` (table `memories` → `memories_claw`)
- Detection and preservation of existing memories
- Deduplication during migration

### Hit Tracking

- Tracks how often each memory is recalled
- Used in diversity penalty for recall
- Factor in garbage collection decisions

### Hybrid Deduplication

Combines two methods for robust duplicate detection:
- **Vector Similarity**: Semantic similarity via embeddings
- **Text Similarity**: Direct text comparison (>85% = duplicate)

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
          "locales": ["fr", "en"],
          "maxCapturePerTurn": 5,
          "captureMinChars": 20,
          "captureMaxChars": 3000,
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
# If OpenClaw is running
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
| `locales` | string[] | `["fr", "en"]` | Active locales (fr, en, es, de) |
| `dbPath` | string | `"~/.openclaw/memory/memory-claw"` | Path to LanceDB database |
| `maxCapturePerTurn` | number | `5` | Maximum memories captured per turn |
| `captureMinChars` | number | `20` | Minimum text length for capture |
| `captureMaxChars` | number | `3000` | Maximum text length for capture |
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

The plugin registers 6 tools that can be used by the AI agent:

### memory_store

Manually store a memo in memory.

**Parameters:**
- `text` (string, required): Text content to store
- `importance` (number, optional): Importance score 0-1 (default: auto-calculated)
- `category` (string, optional): Category (preference, decision, entity, seo, technical, workflow, debug, fact)

**Example:**
```
User: Note that I prefer working with TypeScript rather than JavaScript
→ Agent calls memory_store with the text
→ Result: "Stored: 'I prefer working with TypeScript...' (id: xxx, category: preference, importance: 0.75)"
```

### memory_recall

Search stored memories by semantic similarity with weighted scoring.

**Parameters:**
- `query` (string, required): Search query
- `limit` (number, optional): Max results (default: 5)

**Example:**
```
User: What are my technical preferences?
→ Agent calls memory_recall with "technical preferences"
→ Result: "Found 3 memories: 1. [preference] I prefer TypeScript... (score: 85%, importance: 75%)"
```

### memory_forget

Delete a stored memory by ID or by query.

**Parameters:**
- `memoryId` (string, optional): Specific memory ID to delete
- `query` (string, optional): Query to find memories to delete

**Example:**
```
User: Forget everything I told you about my old project
→ Agent calls memory_forget with query="old project"
→ Result: "Deleted 3 memories matching query."
```

### memory_export

Export all stored memories to a JSON file for backup.

**Parameters:**
- `filePath` (string, optional): Custom file path (default: auto-generated)

**Example:**
```
→ Exports to ~/.openclaw/memory/memory-claw-backup-1234567890.json
```

### memory_import

Import memories from a JSON file.

**Parameters:**
- `filePath` (string, required): Path to the JSON file to import

**Example:**
```
→ Imports from file, deduplicates, and reports imported/skipped count
```

### memory_gc

Run garbage collection to remove old, low-importance memories.

**Parameters:**
- `maxAge` (number, optional): Max age in ms (default: 30 days)
- `minImportance` (number, optional): Min importance (default: 0.5)
- `minHitCount` (number, optional): Min hit count (default: 3)

**Example:**
```
→ Removes old, unimportant, rarely-used memories
```

---

## CLI Commands

The plugin registers 6 CLI commands:

### openclaw memory-claw list

List stored memories with optional filtering.

**Options:**
- `--category`: Filter by category
- `--limit`: Max results (default: 20)
- `--json`: Output as JSON

**Example:**
```bash
openclaw memory-claw list --category preference --limit 10
openclaw memory-claw list --json
```

### openclaw memory-claw search <query>

Search memories by semantic similarity.

**Options:**
- `--limit`: Max results (default: 10)

**Example:**
```bash
openclaw memory-claw search "TypeScript preferences"
openclaw memory-claw search "SEO strategy" --limit 5
```

### openclaw memory-claw stats

Display memory statistics.

**Example:**
```bash
$ openclaw memory-claw stats
Memory Statistics:
------------------
Total memories: 42
Captures: 15
Recalls: 28
Errors: 0
Uptime: 45 minutes
Rate limit: 3/hour (max: 10)
```

### openclaw memory-claw export [path]

Export memories to a JSON file.

**Options:**
- `--path`: Custom file path (default: auto-generated)

**Example:**
```bash
openclaw memory-claw export
openclaw memory-claw export --path ~/backup/memories.json
```

### openclaw memory-claw gc

Run garbage collection.

**Options:**
- `--maxAge`: Max age in days (default: 30)
- `--minImportance`: Min importance (default: 0.5)
- `--minHitCount`: Min hit count (default: 3)

**Example:**
```bash
openclaw memory-claw gc
openclaw memory-claw gc --maxAge 60 --minImportance 0.3
```

### openclaw memory-claw clear

Delete all stored memories (requires confirmation).

**Options:**
- `--confirm=true`: Confirm deletion

**Example:**
```bash
openclaw memory-claw clear --confirm=true
⚠️  This action cannot be undone!
Cleared 42 memories from the database.
```

---

## How It Works

### Architecture

Memory Claw uses three hooks to integrate with OpenClaw:

1. **before_agent_start**: Injects relevant context before each agent response
2. **agent_end**: Captures facts from successful conversations
3. **session_end**: Recovery hook for crash/kill scenarios

### Capture Flow

1. User sends message(s)
2. Consecutive user messages are grouped by semantic similarity
3. Each group is checked against trigger patterns (multilingual)
4. Low-value, injection, and skip patterns are filtered out
5. Dynamic importance is calculated
6. Rate limiting is checked (high importance bypasses)
7. Category is detected
8. Hybrid duplicate detection (vector + text similarity)
9. Memory is stored with embeddings

### Recall Flow

1. User sends new message
2. Query is embedded using Mistral embeddings
3. Vector search finds similar memories
4. Weighted scoring combines: similarity (60%) + importance (30%) + recency (10%)
5. Diversity penalty applied to frequently recalled items
6. Top results are injected into context with safety warning
7. Hit counts are incremented

---

## Multilingual Support

### How It Works

Memory Claw v2.2.0 introduces a multilingual architecture:

1. **Language Detection**: Automatic detection using heuristics (common words, accented characters, patterns)
2. **Locale Loading**: Patterns loaded from `locales/` directory based on config
3. **Pattern Merging**: All active locale patterns are combined
4. **Trigger Matching**: Multilingual triggers for memory capture
5. **Category Detection**: Language-specific category patterns

### Supported Languages

- **French (fr)**: Primary language, most complete patterns
- **English (en)**: Full support
- **Spanish (es)**: Spanish language patterns
- **German (de)**: German language patterns

### Configuration

Configure active locales in your `openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "memory-claw": {
        "config": {
          "locales": ["fr", "en", "es", "de"]
        }
      }
    }
  }
}
```

### Adding a New Locale

To add support for a new language:

1. Create a new file in `locales/` (e.g., `it.ts` for Italian)
2. Export a `LocalePatterns` object with:
   - `languageCode`: ISO code (e.g., "it")
   - `languageName`: Full name (e.g., "Italiano")
   - `triggers`: Regex patterns for memory capture
   - `skipPatterns`: Patterns to skip
   - `lowValuePatterns`: Low-value content patterns
   - `injectionPatterns`: Prompt injection patterns
   - `importanceKeywordPatterns`: Important keyword patterns
   - `categoryOverrides`: Category-specific patterns
   - `characteristics`: Language characteristics for detection
3. Import and register in `locales/index.ts`
4. Add to `availableLocales` object

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
  createdAt: number;    // Creation timestamp
  updatedAt: number;    // Last update timestamp
  source: string;       // Source (manual, agent_end, session_end, auto-capture)
  hitCount: number;     // Number of times recalled
}
```

**Table Name:** `memories_claw`

**Legacy Table Names:**
- `memories`: Original memory-lancedb table (auto-migration)
- `memories_fr`: Memory French v2.1.x table (auto-migration)

**Vector Dimension:** 1024 (Mistral Embed)

---

## Categories

Memories are automatically categorized into 8 types:

| Category | Importance | Description | Example |
|----------|------------|-------------|---------|
| `entity` | 0.9 | People, contacts, companies | "John Smith is my client" |
| `decision` | 0.85 | Decisions made | "We decided to use PostgreSQL" |
| `preference` | 0.7 | Preferences, choices | "I prefer TypeScript over JavaScript" |
| `technical` | 0.65 | Technical config, infrastructure | "The server is on nginx" |
| `seo` | 0.6 | SEO, marketing, content | "Keywords: 'travel italy'" |
| `workflow` | 0.6 | Processes, methods | "Always test before deploying" |
| `debug` | 0.4 | Errors, bugs | "Error 404 on /api/users" |
| `fact` | 0.5 | General facts | "Paris is the capital of France" |

---

## Garbage Collection

### How GC Works

The automatic garbage collection removes old, low-value memories based on three criteria:

1. **Age**: Older than 30 days (configurable)
2. **Importance**: Less than 0.5
3. **Hit Count**: Less than 3 recalls

Only memories meeting **all three** criteria are deleted.

### Configuration

- **Interval**: Every 24 hours (configurable via `gcInterval`)
- **Initial Run**: 1 minute after startup
- **Max Age**: 30 days (configurable via `gcMaxAge`)

The GC preserves important or frequently used memories.

### Manual GC

Run GC manually via tool or CLI:

```bash
# Via CLI
openclaw memory-claw gc --maxAge 60 --minImportance 0.3

# Via tool (agent can call)
memory_gc with maxAge=5184000000, minImportance=0.3, minHitCount=3
```

---

## Export/Import

### Export Format

Memories are exported to a versioned JSON format:

```json
{
  "version": "2.0.0",
  "exportedAt": 1234567890000,
  "count": 42,
  "memories": [
    {
      "id": "uuid",
      "text": "Memory text",
      "importance": 0.75,
      "category": "preference",
      "createdAt": 1234567890000,
      "updatedAt": 1234567890000,
      "source": "manual",
      "hitCount": 5
    }
  ]
}
```

### Import Process

1. Read JSON file
2. For each memory:
   - Check for duplicates by text similarity (>85% = skip)
   - Regenerate embedding
   - Store with original metadata
3. Report imported/skipped count

### Backup Workflow

```bash
# Export memories
openclaw memory-claw export --path ~/backup/memories-$(date +%Y%m%d).json

# On new machine or after reset
openclaw memory-claw import ~/backup/memories-20250318.json
```

---

## Migration

### Automatic Migration

Memory Claw automatically migrates from legacy memory plugins:

1. **memory-lancedb**: Table `memories` → `memories_claw`
2. **memory-french**: Table `memories_fr` → `memories_claw`

Migration happens on first startup if old tables are detected.

### Migration Process

1. Detect old table
2. Read existing entries
3. Check for duplicates with new memories
4. Store in new table `memories_claw`
5. Log migration count

**Note:** Old tables are not deleted (safety measure)

### Manual Migration

If automatic migration fails, you can trigger it manually:

1. Stop OpenClaw
2. Ensure old DB exists at `~/.openclaw/memory/memory-french` or `~/.openclaw/memory/memory-lancedb`
3. Start OpenClaw
4. Check logs for migration confirmation

---

## Compatibility

### OpenClaw Versions

Memory Claw is compatible with OpenClaw versions that support:
- Plugin SDK (hooks, tools, CLI)
- LanceDB integration
- OpenAI-compatible embedding APIs

### Update Resilience

Memory Claw survives OpenClaw updates because:
- Database is independent (`~/.openclaw/memory/memory-claw`)
- Configuration is in `openclaw.json`
- Tools are registered dynamically via plugin API
- Hooks are registered via plugin SDK
- No dependency on OpenClaw internal code

### Breaking Changes

Memory Claw uses semantic versioning. Major version changes may include breaking changes. Check changelog before upgrading.

---

## Troubleshooting

### Plugin Not Loading

**Issue:** Plugin doesn't appear to be active

**Solutions:**
- Check `openclaw.json` has correct plugin entry under `plugins.entries.memory-claw`
- Verify `embedding.apiKey` is set or `MISTRAL_API_KEY` env var exists
- Check OpenClaw logs for errors: `openclaw logs`
- Ensure `npm install` was run in plugin directory

### No Memories Being Captured

**Issue:** Conversations aren't being stored

**Solutions:**
- Check rate limit: `openclaw memory-claw stats`
- Verify triggers match your language (check `locales` config)
- Enable stats: Set `enableStats: true` in config
- Check logs for capture attempts
- Verify `maxCapturePerTurn` isn't too low

### Poor Recall Results

**Issue:** Recalled memories aren't relevant

**Solutions:**
- Increase `recallLimit` to fetch more candidates
- Lower `recallMinScore` to include more results
- Ensure `enableWeightedRecall: true` for better ranking
- Check if memories were captured (use `memory-claw list`)
- Verify embedding model is working (check API key)

### Database Errors

**Issue:** LanceDB connection errors

**Solutions:**
- Check `dbPath` is writable
- Ensure sufficient disk space
- Verify LanceDB is installed: `npm list @lancedb/lancedb`
- Try resetting DB: Delete `~/.openclaw/memory/memory-claw` and restart

### API Key Issues

**Issue:** Embedding API failures

**Solutions:**
- Verify Mistral API key is valid
- Check API key hasn't expired
- Ensure sufficient API quota
- Test API key: `curl -H "Authorization: Bearer $MISTRAL_API_KEY" https://api.mistral.ai/v1/models`

### High Memory Usage

**Issue:** High RAM or disk usage

**Solutions:**
- Run garbage collection: `openclaw memory-claw gc`
- Reduce `gcMaxAge` to delete older memories
- Export and clear: `openclaw memory-claw export && openclaw memory-claw clear --confirm=true`
- Reduce `maxCapturePerTurn` to limit captures

---

## Repository

- **GitHub**: https://github.com/duan78/memory-claw
- **Issues**: Report bugs and feature requests on GitHub
- **Author**: duan78

---

## License

ISC

---

## Changelog

### v2.2.0 (Current)
- Multilingual support (French, English, Spanish, German)
- Automatic language detection
- Locale-specific trigger and category patterns
- Renamed from memory-french to memory-claw
- Migration support from memory-french v2.1.x

### v2.1.0
- Dynamic importance calculation
- Weighted recall (similarity + importance + recency)
- Multi-message context grouping
- Enhanced prompt injection hardening
- Rate limiting
- CLI commands (list, search, stats, export, gc, clear)
- Persistent statistics
- Automatic garbage collection

### v2.0.0
- 100% autonomous plugin (own DB, config, tools)
- Extended database schema (importance, category, source, hitCount)
- Three hooks (before_agent_start, agent_end, session_end)
- Automatic migration from memory-lancedb
- Export/import JSON
- Garbage collection

---

**Memory Claw v2.2.0 — Your memory, enhanced.** 🧠✨
