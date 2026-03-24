#!/usr/bin/env node
/**
 * Memory Claw v2.4.20 - Fix/Regenerate Embeddings
 *
 * v2.4.20 improvements:
 * - FIXED: Config path now looks in openclaw.json instead of config.json
 * - FIXED: Uses update() method instead of delete+add to prevent data loss
 * - FIXED: Fallback to delete+add if update fails (for schema compatibility)
 *
 * This script:
 * 1. Regenerates embeddings for ALL rows or only broken rows (with --force flag)
 * 2. Cleans content by removing "Sender (untrusted metadata)" prefixes
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
 * Enhanced metadata cleaning with more comprehensive patterns
 */
function cleanSenderMetadata(text) {
  if (!text || typeof text !== "string") return text;

  // Remove sender metadata prefixes at the start of text
  const patterns = [
    // Original patterns
    /^Sender\s*\(untrusted\s*metadata\):\s*\{\s*\}\s*/gi,
    /^Conversation\s*info\s*\(untrusted\s*metadata\):\s*\{\s*\}\s*/gi,

    // Enhanced timestamp patterns - catch more variations
    /^\[\w+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+[^\]]+\]\s*/g, // [Mon 2026-03-23 15:52 GMT+1]
    /^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s*/g, // [2026-03-23 15:52:30]
    /^\[\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+\w+\]\s*/g, // [03/23/2026 15:52 GMT]
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[A-Z]+\s*/g, // 2026-03-23 15:52:30 GMT

    // System message prefixes
    /^System\s*:\s*/gi,
    /^Assistant\s*:\s*/gi,
    /^User\s*:\s*/gi,
    /^Tool\s*:\s*/gi,
    /^Function\s*:\s*/gi,

    // Tool call artifacts
    /^Tool\s+Call\s*:\s*/gi,
    /^Function\s+Call\s*:\s*/gi,
    /^Result\s*:\s*/gi,
    /^Error\s*:\s*/gi,

    // Additional metadata headers
    /^From\s*:\s*.+$/m, // From: someone
    /^To\s*:\s*.+$/m, // To: someone
    /^Subject\s*:\s*.+$/m, // Subject: something
    /^Date\s*:\s*.+$/m, // Date: something
    /^Message-ID\s*:\s*.+$/m, // Message-ID: xxx

    // Sender/recipient patterns
    /^Sender\s*:\s*\{\s*\}/gim,
    /^From\s*\(untrusted\)/gim,

    // Empty metadata objects
    /^\{\s*\}\s*/g,
  ];

  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned.trim();
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
  console.log("Memory Claw v2.4.18 - Embedding Fix/Regeneration Script");
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
    // LanceDB vectors are objects, not plain arrays - check for length instead
    const hasValidVector = row.vector && typeof row.vector.length === 'number' && row.vector.length > 0;
    const originalText = row.text || "";

    // Check if text needs cleaning
    const cleanedText = cleanSenderMetadata(originalText);
    const needsCleaning = cleanedText !== originalText;

    // Determine if row needs processing
    const needsProcessing = FORCE_REGENERATE_ALL || !hasValidVector || needsCleaning;

    if (needsProcessing) {
      totalProcessed++;
      const progress = `[${i + 1}/${results.length}]`;

      try {
        console.log(`${progress} Processing row ${row.id.slice(0, 8)}...`);
        console.log(`    Has vector: ${hasValidVector ? "Yes" : "No"}`);
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
