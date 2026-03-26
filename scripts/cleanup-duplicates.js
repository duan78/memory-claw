#!/usr/bin/env node
/**
 * Memory Claw - Cleanup Duplicate Test Memories
 *
 * This script identifies and removes duplicate memories based on text similarity.
 * Keeps the oldest version of each unique memory and removes newer duplicates.
 */

import { connect } from "@lancedb/lancedb";

const DB_PATH = "/root/.openclaw/memory/memory-claw";
const TABLE_NAME = "memories_claw";

/**
 * Calculate text similarity (simple word-based comparison)
 */
function calculateSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

async function cleanupDuplicates() {
  console.log("=".repeat(60));
  console.log("Memory Claw - Duplicate Cleanup Script");
  console.log("=".repeat(60));

  console.log("\nConnecting to database at:", DB_PATH);
  const db = await connect(DB_PATH);
  const table = await db.openTable(TABLE_NAME);

  // Get all memories
  console.log("Fetching all memories...");
  const results = await table.query().limit(10000).toArray();
  console.log(`Found ${results.length} memories\n`);

  if (results.length === 0) {
    console.log("No memories to clean up.");
    return;
  }

  // Group by text similarity
  const groups = [];
  const processed = new Set();

  for (let i = 0; i < results.length; i++) {
    if (processed.has(i)) continue;

    const current = results[i];
    const group = [current];
    processed.add(i);

    // Find similar memories
    for (let j = i + 1; j < results.length; j++) {
      if (processed.has(j)) continue;

      const other = results[j];
      const similarity = calculateSimilarity(current.text, other.text);

      if (similarity > 0.9) { // 90% similarity threshold
        group.push(other);
        processed.add(j);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  if (groups.length === 0) {
    console.log("✅ No duplicates found. Database is clean.");
    return;
  }

  console.log(`Found ${groups.length} duplicate groups:\n`);

  // Display duplicates
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    console.log(`Group ${i + 1}: ${group.length} duplicates`);
    console.log(`Text: "${group[0].text.slice(0, 80)}..."`);
    console.log("");
  }

  // Sort each group by createdAt (oldest first) and delete newer duplicates
  let totalDeleted = 0;

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];

    // Sort by createdAt (ascending - oldest first)
    group.sort((a, b) => a.createdAt - b.createdAt);

    // Keep the first one (oldest), delete the rest
    const toKeep = group[0];
    const toDelete = group.slice(1);

    console.log(`\nGroup ${i + 1}:`);
    console.log(`  Keeping: ${toKeep.id.slice(0, 8)}... (created: ${new Date(toKeep.createdAt).toISOString()})`);
    console.log(`  Deleting: ${toDelete.length} duplicates`);

    for (const mem of toDelete) {
      try {
        await table.delete(`id = '${mem.id}'`);
        console.log(`    ✓ Deleted ${mem.id.slice(0, 8)}... (created: ${new Date(mem.createdAt).toISOString()})`);
        totalDeleted++;
      } catch (error) {
        console.error(`    ✗ Failed to delete ${mem.id.slice(0, 8)}...: ${error.message}`);
      }
    }
  }

  // Verify cleanup
  const finalCount = await table.countRows();
  const originalCount = results.length;

  console.log("\n" + "=".repeat(60));
  console.log("CLEANUP COMPLETE");
  console.log("=".repeat(60));
  console.log(`Original memories: ${originalCount}`);
  console.log(`Deleted: ${totalDeleted}`);
  console.log(`Remaining: ${finalCount}`);
  console.log(`Space saved: ~${(totalDeleted * 1.5).toFixed(1)} KB (estimated)`);
  console.log("=".repeat(60));
}

cleanupDuplicates().catch(console.error);
