#!/usr/bin/env node
/**
 * Memory Claw v2.4.27 - Fix/Regenerate Embeddings
 *
 * v2.4.27 improvements:
 * - FIXED: Synchronized with text.ts v2.4.27 enhanced metadata cleaning
 * - FIXED: Uses comprehensive cleanSenderMetadata patterns from text.ts
 * - FIXED: Supports nested JSON metadata blocks
 * - FIXED: Better handling of malformed metadata
 * - FIXED: Enhanced detection and removal of tool/system artifacts
 * - FIXED: Added support for Claude-specific metadata formats
 *
 * v2.4.26 improvements:
 * - FIXED: Auto-capture storage now uses cleaned text (was using unnormalized combinedText)
 * - FIXED: Synchronized all text storage paths to use cleanSenderMetadata + normalizeText
 * - FIXED: Ensured embeddings and stored text always use consistently cleaned input
 * - IMPROVED: Better capture quality with explicit metadata cleaning
 *
 * This script:
 * 1. Regenerates embeddings for ALL rows or only broken rows (with --force flag)
 * 2. Cleans content by removing ALL forms of sender metadata and system artifacts
 * 3. Verifies the embeddings API is working correctly
 * 4. Provides detailed progress indicators and error handling
 *
 * Usage:
 *   node scripts/fix-embeddings.js           # Fix only broken/unclean rows
 *   node scripts/fix-embeddings.js --force    # Regenerate ALL embeddings
 *   node scripts/fix-embeddings.js --dry-run  # Show what would be done
 */

import { connect } from "@lancedb/lancedb";
import { readFileSync } from "node:fs";

const DB_PATH = "/root/.openclaw/memory/memory-claw";
const TABLE_NAME = "memories_claw";

// Parse command line arguments
const args = process.argv.slice(2);
const FORCE_REGENERATE_ALL = args.includes("--force");
const DRY_RUN = args.includes("--dry-run");

// Load API key from environment or config
let API_KEY = process.env.MISTRAL_API_KEY;
if (!API_KEY) {
  try {
    // Try openclaw.json first (newer OpenClaw versions)
    const configPath = "/root/.openclaw/openclaw.json";
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    API_KEY = config.plugins?.entries?.["memory-claw"]?.config?.embedding?.apiKey;
  } catch (e) {
    console.error("Could not load API key from config:", e.message);
  }
}

if (!API_KEY) {
  console.error("ERROR: No MISTRAL_API_KEY found. Set MISTRAL_API_KEY environment variable.");
  process.exit(1);
}

/**
 * v2.4.27: Comprehensive metadata cleaning synchronized with text.ts v2.4.27
 * - Enhanced cleanSenderMetadata function for consistent metadata cleaning
 * - Multi-phase cleaning approach for better accuracy
 * - Support for nested JSON metadata blocks
 * - Better handling of malformed metadata
 * - Enhanced detection and removal of tool/system artifacts
 * - Added support for Claude-specific metadata formats
 *
 * This function removes ALL forms of sender metadata and system artifacts:
 * - JSON metadata blocks (```json wrapped, inline, multi-line, nested)
 * - Sender metadata prefixes (all variants)
 * - Timestamp patterns (ISO, US, custom, international)
 * - System message prefixes (System:, Assistant:, User:, Tool:, Function:)
 * - Tool call artifacts (all variants)
 * - Email-style headers (From:, To:, Subject:, Date:, Message-ID:, CC:, BCC:)
 * - System artifacts ([INST], [SYSTEM], instruction tags, special tokens)
 * - Claude-specific formats (<thinking>, <reflection>, etc.)
 * - Empty metadata objects and whitespace
 */
function cleanSenderMetadata(text) {
  if (!text || typeof text !== "string") return text;

  let cleaned = text;

  // Phase 1: Remove JSON metadata blocks (most aggressive patterns first)
  const jsonPatterns = [
    // JSON metadata blocks with ```json wrapper (regardless of position)
    /(?:Sender|Conversation\s*info|Context|Metadata)\s*\(untrusted\s*metadata\):\s*```json\s*\n?[\s\S]*?```\s*/gi,

    // Also match without json identifier
    /(?:Sender|Conversation\s*info|Context|Metadata)\s*\(untrusted\s*metadata\):\s*```\s*\n?[\s\S]*?```\s*/gi,

    // More aggressive patterns to catch JSON metadata blocks
    /^(Sender|Conversation\s*info|Context|Metadata)\s*\(untrusted\s*metadata\):\s*```\s*\n?[\s\S]*?```\s*$/gim,

    // FIX for inline JSON after "Sender (untrusted metadata):"
    // Matches: "Sender (untrusted metadata): {...}" where {...} is any JSON object
    /^(?:Sender|Conversation\s*info|Context|Metadata)\s*\(untrusted\s*metadata\):\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*/gim,

    // FIX for multi-line JSON objects after "Sender (untrusted metadata):"
    // Matches JSON objects that span multiple lines (with nesting support)
    /^(?:Sender|Conversation\s*info|Context|Metadata)\s*\(untrusted\s*metadata\):\s*\{[\s\S]*?\n\}\s*/gim,

    // FIX for simple "Sender:" prefix with inline JSON
    /^Sender\s*:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*/gim,

    // FIX for "Sender:" or "Sender (untrusted):" followed by any text until newline
    /^(?:Sender\s*\(untrusted\)|Sender)\s*:\s*.+\n?/gim,

    // v2.4.27: Additional patterns for metadata in different formats
    /^metadata:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*/gim,
    /^context:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*/gim,
    /^info:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*/gim,
  ];

  for (const pattern of jsonPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 2: Remove timestamp patterns (all variations)
  const timestampPatterns = [
    // [Mon 2026-03-23 15:52 GMT+1]
    /^\[\w+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+[^\]]+\]\s*/g,
    // [2026-03-23 15:52:30]
    /^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s*/g,
    // [03/23/2026 15:52 GMT]
    /^\[\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+\w+\]\s*/g,
    // 2026-03-23 15:52:30 GMT
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[A-Z]+\s*/g,
    // v2.4.27: Additional timestamp formats
    /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s*/g,
    /^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}\s*/g,
    // ISO 8601 with timezone
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\s*/g,
    // Unix timestamp
    /^\d{10,13}\s*/g,
  ];

  for (const pattern of timestampPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 3: Remove system message prefixes
  const systemMessagePatterns = [
    /^System\s*:\s*/gi,
    /^Assistant\s*:\s*/gi,
    /^User\s*:\s*/gi,
    /^Tool\s*:\s*/gi,
    /^Function\s*:\s*/gi,
    /^Model\s*:\s*/gi,
    /^Bot\s*:\s*/gi,
    /^Agent\s*:\s*/gi,
  ];

  for (const pattern of systemMessagePatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 4: Remove tool call artifacts
  const toolCallPatterns = [
    /^Tool\s+Call\s*:\s*/gi,
    /^Function\s+Call\s*:\s*/gi,
    /^Result\s*:\s*/gi,
    /^Error\s*:\s*/gi,
    /^Response\s*:\s*/gi,
    /^Output\s*:\s*/gi,
    // v2.4.27: Additional tool-related patterns
    /^Called\s*:\s*/gi,
    /^Executed\s*:\s*/gi,
    /^Returned\s*:\s*/gi,
  ];

  for (const pattern of toolCallPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 5: Remove email-style headers
  const headerPatterns = [
    /^From\s*:\s*.+$/m, // From: someone
    /^To\s*:\s*.+$/m, // To: someone
    /^Subject\s*:\s*.+$/m, // Subject: something
    /^Date\s*:\s*.+$/m, // Date: something
    /^Message-ID\s*:\s*.+$/m, // Message-ID: xxx
    // v2.4.27: Additional email headers
    /^CC\s*:\s*.+$/m, // CC: recipients
    /^BCC\s*:\s*.+$/m, // BCC: recipients
    /^Reply-To\s*:\s*.+$/m, // Reply-To: address
    /^References\s*:\s*.+$/m, // References: message-ids
    /^In-Reply-To\s*:\s*.+$/m, // In-Reply-To: message-id
  ];

  for (const pattern of headerPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 6: Remove system artifacts and special tokens
  const systemArtifactPatterns = [
    /^\[INST\]/gi,
    /^\[\/INST\]/gi,
    /^\[SYSTEM\]/gi,
    /^\[\/SYSTEM\]/gi,
    /^\[USER\]/gi,
    /^\[\/USER\]/gi,
    /^\[ASSISTANT\]/gi,
    /^\[\/ASSISTANT\]/gi,
    /^<\|.*?\|>/g,
    /<instruction[^>]*>/gi,
    /<\/instruction>/gi,
    /<system[^>]*>/gi,
    /<\/system>/gi,
    /<prompt[^>]*>/gi,
    /<\/prompt>/gi,
    // v2.4.27: Claude-specific special tokens
    /<thinking[^>]*>/gi,
    /<\/thinking>/gi,
    /<reflection[^>]*>/gi,
    /<\/reflection>/gi,
    /<observation[^>]*>/gi,
    /<\/observation>/gi,
    /<output[^>]*>/gi,
    /<\/output>/gi,
  ];

  for (const pattern of systemArtifactPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 7: Remove JSON metadata patterns at start of lines
  const jsonMetadataPatterns = [
    /^\s*\{\s*"role"\s*:\s*"tool"/gi,
    /^\s*\{\s*"role"\s*:\s*"system"/gi,
    /^\s*\{\s*"tool_call_id"/gi,
    /^\s*\{\s*"function_call"/gi,
    /^\s*\{\s*"function"/gi,
    // v2.4.27: Additional JSON role patterns
    /^\s*\{\s*"role"\s*:\s*"user"/gi,
    /^\s*\{\s*"role"\s*:\s*"assistant"/gi,
    /^\s*\{\s*"content"/gi,
  ];

  for (const pattern of jsonMetadataPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 8: Remove empty metadata objects and clean whitespace
  cleaned = cleaned
    .replace(/^\{\s*\}\s*/g, "")
    .replace(/^\[\s*\]\s*/g, "")
    .replace(/^Sender\s*:\s*\{\s*\}/gim, "")
    .replace(/^From\s*\(untrusted\)\s*/gim, "")
    .replace(/^Metadata\s*:\s*\{\s*\}/gim, "");

  // Phase 9: Final cleanup - remove excessive whitespace and trim
  cleaned = cleaned
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return cleaned;
}

/**
 * v2.4.21: Enhanced vector detection for LanceDB FixedSizeList format
 * - Handles both array and object vectors
 * - Checks for null/undefined vectors
 * - Validates vector length
 */
function hasValidVector(vector) {
  if (!vector) return false;

  // Handle array vectors
  if (Array.isArray(vector)) {
    return vector.length > 0;
  }

  // Handle object vectors (LanceDB FixedSizeList)
  if (typeof vector === 'object') {
    // Check if it has a length property
    if (typeof vector.length === 'number' && vector.length > 0) {
      return true;
    }

    // Check if it's a Float32Array or similar typed array
    if (vector.buffer && vector.byteLength > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Generate embedding using Mistral API with retry logic
 */
async function generateEmbedding(text, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch("https://api.mistral.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistral-embed",
          input: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        // Exponential backoff: 200ms, 400ms, 800ms
        const waitTime = 200 * Math.pow(2, i);
        console.warn(`    Retry ${i + 1}/${retries} after ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  throw lastError;
}

/**
 * Main fix function with enhanced error handling and progress tracking
 */
async function fixEmbeddings() {
  const startTime = Date.now();
  console.log("=".repeat(60));
  console.log("Memory Claw v2.4.27 - Embedding Fix/Regeneration Script");
  console.log("=".repeat(60));
  console.log(`Mode: ${FORCE_REGENERATE_ALL ? "FORCE REGENERATE ALL" : "Fix only broken/unclean rows"}`);
  console.log(`Dry run: ${DRY_RUN ? "YES (no changes will be made)" : "NO"}`);
  console.log("=".repeat(60));

  console.log("\nConnecting to database at:", DB_PATH);
  const db = await connect(DB_PATH);
  const table = await db.openTable(TABLE_NAME);

  // Get all rows
  console.log("Fetching all rows...");
  const results = await table.query().limit(10000).toArray();
  console.log(`Found ${results.length} rows\n`);

  let fixed = 0;
  let skipped = 0;
  let errors = 0;
  let totalProcessed = 0;

  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    // v2.4.21: Use enhanced vector detection
    const hasValidVectorVal = hasValidVector(row.vector);
    const originalText = row.text || "";

    // Check if text needs cleaning
    const cleanedText = cleanSenderMetadata(originalText);
    const needsCleaning = cleanedText !== originalText;

    // Determine if row needs processing
    const needsProcessing = FORCE_REGENERATE_ALL || !hasValidVectorVal || needsCleaning;

    if (needsProcessing) {
      totalProcessed++;
      const progress = `[${i + 1}/${results.length}]`;

      try {
        console.log(`${progress} Processing row ${row.id.slice(0, 8)}...`);
        console.log(`    Has vector: ${hasValidVectorVal ? "Yes" : "No"}`);
        console.log(`    Needs cleaning: ${needsCleaning ? "Yes" : "No"}`);
        console.log(`    Original text: "${originalText.slice(0, 60)}..."`);

        // Generate new embedding for cleaned text
        const textToEmbed = needsCleaning ? cleanedText : originalText;
        console.log(`    Text to embed: "${textToEmbed.slice(0, 60)}..."`);

        if (!DRY_RUN) {
          const vector = await generateEmbedding(textToEmbed);
          console.log(`    Generated vector: ${vector.length}D`);

          // Use update instead of delete+add to avoid schema issues
          try {
            await table.update({
              where: `id = '${row.id}'`,
              values: {
                text: textToEmbed,
                vector: vector,
                updatedAt: Date.now()
              }
            });
            fixed++;
            console.log(`    ✓ Fixed row ${row.id.slice(0, 8)}`);
          } catch (updateError) {
            // If update fails, try delete+add as fallback
            console.warn(`    Update failed, trying delete+add: ${updateError.message}`);
            await table.delete(`id = '${row.id}'`);

            const newEntry = {
              id: row.id,
              text: textToEmbed,
              vector: vector,
              importance: row.importance || 0.5,
              category: row.category || "fact",
              tier: row.tier || "episodic",
              tags: row.tags || [],
              createdAt: row.createdAt || Date.now(),
              updatedAt: Date.now(),
              lastAccessed: row.lastAccessed || Date.now(),
              source: row.source || "agent_end",
              hitCount: row.hitCount || 0,
            };

            await table.add([newEntry]);
            fixed++;
            console.log(`    ✓ Fixed row ${row.id.slice(0, 8)} (via delete+add)`);
          }
        } else {
          console.log(`    [DRY RUN] Would fix this row`);
          fixed++;
        }

        // Rate limiting - wait 100ms between API calls
        if (!DRY_RUN) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`    ✗ Error fixing row ${row.id.slice(0, 8)}:`, error.message);
        errors++;
      }
    } else {
      skipped++;
    }

    // Show progress every 50 rows
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${results.length} rows processed ---\n`);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total rows in database: ${results.length}`);
  console.log(`Rows processed: ${totalProcessed}`);
  console.log(`Fixed: ${fixed} rows`);
  console.log(`Skipped: ${skipped} rows (already valid)`);
  console.log(`Errors: ${errors} rows`);
  console.log(`Time elapsed: ${elapsed}s`);
  console.log("=".repeat(60));

  if (errors > 0) {
    console.warn("\n⚠️  Some rows had errors. Please review the error messages above.");
    process.exit(1);
  }
}

fixEmbeddings().catch(console.error);
