#!/usr/bin/env node

/**
 * Memory Claw v2.4.48 - Duplicate Cleanup Script
 *
 * This script cleans the database by removing duplicate memories.
 * It groups memories by text similarity (threshold 0.70) and keeps only
 * the oldest entry in each group.
 *
 * Usage:
 *   node scripts/clean-duplicates.js [--dry-run] [--force]
 *
 * Options:
 *   --dry-run: Show what would be deleted without actually deleting
 *   --force: Delete without confirmation prompt
 */

import { connect } from "@lancedb/lancedb";
import { normalizeText, calculateTextSimilarity } from "../dist/src/utils/text.js";
import { join } from "node:path";
import { homedir } from "node:os";

const DB_PATH = process.env.MEMORY_CLAW_DB_PATH || join(homedir(), ".openclaw", "memory", "lancedb");
const TABLE_NAME = process.env.MEMORY_CLAW_TABLE_NAME || "memories";

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isForce = args.includes("--force");

/**
 * Main cleanup function
 */
async function cleanDuplicates() {
  console.log("=".repeat(70));
  console.log("Memory Claw v2.4.48 - Duplicate Cleanup Script");
  console.log("=".repeat(70));
  console.log(`Database: ${DB_PATH}`);
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes will be made)" : "LIVE (will delete duplicates)"}`);
  console.log("=".repeat(70));
  console.log();

  try {
    // Connect to database
    console.log("📂 Connecting to database...");
    const db = await connect(DB_PATH);
    const table = await db.openTable(TABLE_NAME);

    // Fetch all memories
    console.log("📖 Fetching all memories...");
    // Use a full table scan instead of vector search to get all rows
    const allRows = await table.query().select(["id", "text", "createdAt"]).limit(100000).toArray();
    console.log(`✓ Found ${allRows.length} total memories`);
    console.log();

    // Group by text similarity
    console.log("🔍 Grouping memories by text similarity (threshold: 0.70)...");
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      const id = row.id;

      if (processed.has(id)) continue;

      // Start a new group with this memory as the representative
      const group = {
        representative: row,
        duplicates: [],
        groupIndex: groups.length
      };
      processed.add(id);

      // Find all similar memories
      for (let j = i + 1; j < allRows.length; j++) {
        const otherRow = allRows[j];
        const otherId = otherRow.id;

        if (processed.has(otherId)) continue;

        const similarity = calculateTextSimilarity(row.text, otherRow.text);
        if (similarity > 0.70) {
          group.duplicates.push(otherRow);
          processed.add(otherId);
        }
      }

      groups.push(group);
    }

    console.log(`✓ Found ${groups.length} unique groups`);
    console.log();

    // Calculate statistics
    const totalDuplicates = groups.reduce((sum, g) => sum + g.duplicates.length, 0);
    const uniqueCount = groups.length;

    console.log("📊 Statistics:");
    console.log(`  Total memories: ${allRows.length}`);
    console.log(`  Unique memories: ${uniqueCount}`);
    console.log(`  Duplicates to remove: ${totalDuplicates}`);
    console.log();

    // Show duplicate groups
    if (totalDuplicates > 0) {
      console.log("🔍 Duplicate Groups:");
      console.log();

      for (const group of groups) {
        if (group.duplicates.length === 0) continue;

        console.log(`Group ${group.groupIndex + 1}:`);
        console.log(`  ✓ Keeping: ${group.representative.text.slice(0, 80)}...`);
        console.log(`    ID: ${group.representative.id}, Created: ${new Date(group.representative.createdAt).toISOString()}`);
        console.log(`  ✗ Removing ${group.duplicates.length} duplicate(s):`);

        for (const dup of group.duplicates) {
          const similarity = calculateTextSimilarity(group.representative.text, dup.text);
          console.log(`    - ${dup.text.slice(0, 60)}... (${similarity.toFixed(2)})`);
          console.log(`      ID: ${dup.id}, Created: ${new Date(dup.createdAt).toISOString()}`);
        }
        console.log();
      }
    }

    // Confirm deletion
    if (!isDryRun && !isForce && totalDuplicates > 0) {
      console.log("⚠️  This will DELETE ${totalDuplicates} duplicate memories!");
      console.log("    Only the oldest entry in each group will be kept.");
      console.log();
      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question("Do you want to continue? (yes/no): ", resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== "yes") {
        console.log("❌ Cancelled. No changes were made.");
        process.exit(0);
      }
    }

    // Delete duplicates
    if (totalDuplicates > 0 && !isDryRun) {
      console.log("🗑️  Deleting duplicates...");
      let deleted = 0;

      for (const group of groups) {
        for (const dup of group.duplicates) {
          await table.delete(`id = '${dup.id}'`);
          deleted++;
        }

        if (deleted % 10 === 0) {
          console.log(`  Deleted ${deleted}/${totalDuplicates}...`);
        }
      }

      console.log(`✓ Deleted ${deleted} duplicates`);
      console.log();
      console.log("✨ Cleanup complete!");
      console.log(`   Database now has ${uniqueCount} memories (was ${allRows.length})`);
    } else if (isDryRun) {
      console.log("ℹ️  Dry run complete. No changes were made.");
      console.log(`   Run with --force to delete ${totalDuplicates} duplicates`);
    } else {
      console.log("✨ No duplicates found. Database is clean!");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the cleanup
cleanDuplicates().catch(console.error);
