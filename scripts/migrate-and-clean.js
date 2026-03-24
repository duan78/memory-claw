#!/usr/bin/env node
/**
 * Memory Claw v2.4.21 - Migrate and Clean Old Data
 *
 * This script:
 * 1. Reads old data from memory-french database
 * 2. Cleans all metadata from the content
 * 3. Regenerates embeddings with cleaned text
 * 4. Stores in the new memory-claw database
 *
 * Usage:
 *   node scripts/migrate-and-clean.js
 */

import { connect } from "@lancedb/lancedb";
import { readFileSync } from "node:fs";

const OLD_DB_PATH = "/root/.openclaw/memory/memory-french";
const NEW_DB_PATH = "/root/.openclaw/memory/memory-claw";
const OLD_TABLE = "memories_fr";
const NEW_TABLE = "memories_claw";

// Load API key from environment or config
let API_KEY = process.env.MISTRAL_API_KEY;
if (!API_KEY) {
  try {
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

  const patterns = [
    // v2.4.21: FIXED patterns to match entire metadata blocks regardless of position
    // These patterns match the full metadata blocks with ```json wrapper
    /(?:Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*```json[^`]*```/gi,

    // Also match without json identifier
    /(?:Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*```[^`]*```/gi,

    // More aggressive patterns to catch JSON metadata blocks
    /^(Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*```[^`]*```.*$/gim,

    // Enhanced timestamp patterns
    /^\[\w+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+[^\]]+\]\s*/g,
    /^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s*/g,
    /^\[\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+\w+\]\s*/g,
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[A-Z]+\s*/g,

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
    /^From\s*:\s*.+$/m,
    /^To\s*:\s*.+$/m,
    /^Subject\s*:\s*.+$/m,
    /^Date\s*:\s*.+$/m,
    /^Message-ID\s*:\s*.+$/m,

    // Sender/recipient patterns
    /^Sender\s*:\s*\{\s*\}/gim,
    /^From\s*\(untrusted\)/gim,

    // Empty metadata objects
    /^\{\s*\}\s*/g,

    // Additional system artifacts
    /^\[INST\]/gi,
    /^\[\/INST\]/gi,
    /^\[SYSTEM\]/gi,
    /^<\|.*?\|>/g,
    /<instruction[^>]*>/gi,
    /<system[^>]*>/gi,
    /<prompt[^>]*>/gi,

    // JSON metadata patterns
    /^\s*\{\s*"role"\s*:\s*"tool"/gi,
    /^\s*\{\s*"role"\s*:\s*"system"/gi,
    /^\s*\{\s*"tool_call_id"/gi,
    /^\s*\{\s*"function"/gi,

    // Remove media attachment notices
    /^\[media\s+attached[^\]]*\]\s*/gi,
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
        const waitTime = 200 * Math.pow(2, i);
        console.warn(`    Retry ${i + 1}/${retries} after ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  throw lastError;
}

async function migrateAndClean() {
  const startTime = Date.now();
  console.log("=".repeat(60));
  console.log("Memory Claw v2.4.21 - Migrate and Clean Old Data");
  console.log("=".repeat(60));

  console.log("\nConnecting to databases...");
  console.log(`  Old: ${OLD_DB_PATH} (${OLD_TABLE})`);
  console.log(`  New: ${NEW_DB_PATH} (${NEW_TABLE})`);

  const oldDb = await connect(OLD_DB_PATH);
  const newDb = await connect(NEW_DB_PATH);

  const oldTable = await oldDb.openTable(OLD_TABLE);

  // Create new table if it doesn't exist
  const newTables = await newDb.tableNames();
  let newTable;
  if (!newTables.includes(NEW_TABLE)) {
    console.log(`Creating ${NEW_TABLE} table...`);
    newTable = await newDb.createTable(NEW_TABLE, [
      {
        id: "__schema__",
        text: "",
        vector: Array.from({ length: 1024 }).fill(0), // mistral-embed uses 1024D
        importance: 0,
        category: "other",
        tier: "episodic",
        tags: [""],
        createdAt: 0,
        updatedAt: 0,
        lastAccessed: 0,
        source: "manual",
        hitCount: 0,
      },
    ]);
    await newTable.delete('id = "__schema__"');
    console.log(`Created ${NEW_TABLE} table`);
  } else {
    newTable = await newDb.openTable(NEW_TABLE);
  }

  console.log("\nFetching old memories...");
  const oldMemories = await oldTable.query().limit(10000).toArray();
  console.log(`Found ${oldMemories.length} old memories\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < oldMemories.length; i++) {
    const row = oldMemories[i];
    const originalText = row.text || "";
    const cleanedText = cleanSenderMetadata(originalText);

    console.log(`[${i + 1}/${oldMemories.length}] Processing memory ${row.id.slice(0, 8)}...`);
    console.log(`    Original: "${originalText.slice(0, 60)}..."`);
    console.log(`    Cleaned:  "${cleanedText.slice(0, 60)}..."`);

    // Check if text is too short after cleaning
    if (cleanedText.length < 30) {
      console.log(`    ⚠ Skipped: text too short after cleaning (${cleanedText.length} chars)`);
      skipped++;
      continue;
    }

    try {
      // Check for duplicates in new database
      const existing = await newTable.query()
        .where(`text LIKE '%${cleanedText.slice(0, 30).replace(/'/g, "''")}%'`)
        .limit(1)
        .toArray();

      if (existing.length > 0) {
        console.log(`    ⚠ Skipped: duplicate found`);
        skipped++;
        continue;
      }

      // Generate new embedding for cleaned text
      const vector = await generateEmbedding(cleanedText);
      console.log(`    Generated vector: ${vector.length}D`);

      // Create new entry with cleaned data
      const newEntry = {
        id: row.id,
        text: cleanedText,
        vector: vector,
        importance: row.importance || 0.5,
        category: row.category || "fact",
        tier: row.tier || "episodic",
        tags: row.tags || [],
        createdAt: row.createdAt || Date.now(),
        updatedAt: Date.now(),
        lastAccessed: Date.now(),
        source: row.source || "manual",
        hitCount: row.hitCount || 0,
      };

      await newTable.add([newEntry]);
      imported++;
      console.log(`    ✓ Imported memory ${row.id.slice(0, 8)}`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`    ✗ Error:`, error.message);
      errors++;
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total old memories: ${oldMemories.length}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Time elapsed: ${elapsed}s`);
  console.log("=".repeat(60));

  if (errors > 0) {
    console.warn("\n⚠️  Some memories had errors. Please review the error messages above.");
    process.exit(1);
  }
}

migrateAndClean().catch(console.error);
