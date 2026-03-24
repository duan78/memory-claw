#!/usr/bin/env node
/**
 * Memory Claw - Fix Existing Embeddings
 *
 * This script:
 * 1. Regenerates embeddings for all rows that have missing/invalid vectors
 * 2. Cleans content by removing "Sender (untrusted metadata)" prefixes
 * 3. Verifies the embeddings API is working correctly
 */

import { connect } from "@lancedb/lancedb";
import { readFileSync } from "node:fs";

const DB_PATH = "/root/.openclaw/memory/memory-claw";
const TABLE_NAME = "memories_claw";

// Load API key from environment or config
let API_KEY = process.env.MISTRAL_API_KEY;
if (!API_KEY) {
  try {
    const configPath = "/root/.openclaw/config.json";
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    API_KEY = config.plugins?.entries?.["memory-claw"]?.config?.embedding?.apiKey;
  } catch (e) {
    console.error("Could not load API key from config");
  }
}

if (!API_KEY) {
  console.error("ERROR: No MISTRAL_API_KEY found. Set MISTRAL_API_KEY environment variable.");
  process.exit(1);
}

/**
 * Clean sender metadata from text content
 */
function cleanSenderMetadata(text) {
  if (!text || typeof text !== "string") return text;

  // Remove common metadata prefixes
  const patterns = [
    /^Sender\s*\(untrusted\s*metadata\):\s*\{\s*\}\s*/gi,
    /^Conversation\s*info\s*\(untrusted\s*metadata\):\s*\{\s*\}\s*/gi,
    /^\[\w+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+[^\]]+\]\s*/g, // [Mon 2026-03-23 15:52 GMT+1]
  ];

  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned.trim();
}

/**
 * Generate embedding using Mistral API
 */
async function generateEmbedding(text) {
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
}

/**
 * Main fix function
 */
async function fixEmbeddings() {
  console.log("Connecting to database at:", DB_PATH);
  const db = await connect(DB_PATH);
  const table = await db.openTable(TABLE_NAME);

  // Get all rows
  console.log("Fetching all rows...");
  const results = await table.query().limit(1000).toArray();
  console.log(`Found ${results.length} rows`);

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of results) {
    const hasValidVector = row.vector && Array.isArray(row.vector) && row.vector.length > 0;
    const originalText = row.text || "";

    // Check if text needs cleaning
    const cleanedText = cleanSenderMetadata(originalText);
    const needsCleaning = cleanedText !== originalText;

    if (!hasValidVector || needsCleaning) {
      try {
        console.log(`\nProcessing row ${row.id.slice(0, 8)}...`);
        console.log(`  Has vector: ${hasValidVector}`);
        console.log(`  Needs cleaning: ${needsCleaning}`);
        console.log(`  Original text: "${originalText.slice(0, 80)}..."`);

        // Generate new embedding for cleaned text
        const textToEmbed = needsCleaning ? cleanedText : originalText;
        console.log(`  Text to embed: "${textToEmbed.slice(0, 80)}..."`);

        const vector = await generateEmbedding(textToEmbed);
        console.log(`  Generated vector: ${vector.length}D`);

        // Delete old row and insert new one
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
        console.log(`  ✓ Fixed row ${row.id.slice(0, 8)}`);

        // Rate limiting - wait 100ms between API calls
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`  ✗ Error fixing row ${row.id.slice(0, 8)}:`, error.message);
        errors++;
      }
    } else {
      skipped++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Fixed: ${fixed} rows`);
  console.log(`Skipped: ${skipped} rows (already valid)`);
  console.log(`Errors: ${errors} rows`);
}

fixEmbeddings().catch(console.error);
