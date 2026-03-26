#!/usr/bin/env -S node --loader ts-node/esm
/**
 * Memory Claw v2.4.46 - Duplicate Cleanup Script
 *
 * This script removes duplicate memories from the database.
 * A duplicate is defined as a memory with text similarity > 0.70 to another memory.
 *
 * Usage: npx ts-node scripts/cleanup-duplicates.ts
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

interface MemoryEntry {
  id: string;
  text: string;
  vector: number[];
  importance: number;
  category: string;
  tier: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  lastAccessed: number;
  source: string;
  hitCount: number;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .toLowerCase();
}

/**
 * Calculate Jaccard similarity between two texts
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);

  if (normalized1 === normalized2) return 1.0;
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return 0.9;

  const words1 = normalized1.split(/\s+/);
  const words2 = normalized2.split(/\s+/);
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Main cleanup function
 */
async function cleanupDuplicates() {
  const dbPath = join(homedir(), ".openclaw", "memory", "memory-claw");
  const lancedb = await import("@lancedb/lancedb");
  const db = await lancedb.connect(dbPath);
  const TABLE_NAME = "memories_claw";

  console.log("🔍 Loading memories from database...");
  const table = await db.openTable(TABLE_NAME);
  const results = await table.query().limit(10000).toArray();

  console.log(`📊 Found ${results.length} memories`);

  // Group duplicates by text similarity
  const toDelete: string[] = [];
  const processed = new Set<number>();
  const duplicates: Array<{ keep: MemoryEntry; delete: MemoryEntry[]; similarity: number }> = [];

  for (let i = 0; i < results.length; i++) {
    if (processed.has(i)) continue;

    const entry1 = results[i] as any;
    const text1 = entry1.text as string;

    const group: MemoryEntry[] = [entry1];

    for (let j = i + 1; j < results.length; j++) {
      if (processed.has(j)) continue;

      const entry2 = results[j] as any;
      const text2 = entry2.text as string;

      const similarity = calculateTextSimilarity(text1, text2);
      if (similarity > 0.70) {
        group.push(entry2);
        processed.add(j);
      }
    }

    processed.add(i);

    if (group.length > 1) {
      // Sort by hitCount and createdAt to decide which to keep
      group.sort((a, b) => {
        const hitCountA = (a.hitCount as number) || 0;
        const hitCountB = (b.hitCount as number) || 0;
        if (hitCountA !== hitCountB) return hitCountB - hitCountA; // Keep most accessed
        return (b.createdAt as number) - (a.createdAt as number); // Keep newest
      });

      const [keep, ...toRemove] = group;
      const similarity = calculateTextSimilarity(keep.text, toRemove[0].text);

      duplicates.push({
        keep,
        delete: toRemove,
        similarity,
      });

      for (const entry of toRemove) {
        toDelete.push(entry.id as string);
      }
    }
  }

  console.log(`\n🔍 Found ${duplicates.length} duplicate groups:`);
  console.log(`📝 Total duplicates to delete: ${toDelete.length}`);

  // Show duplicates before deleting
  if (duplicates.length > 0) {
    console.log("\n📋 Duplicate groups:");
    for (let i = 0; i < Math.min(10, duplicates.length); i++) {
      const group = duplicates[i];
      console.log(`\n${i + 1}. Similarity: ${(group.similarity * 100).toFixed(1)}%`);
      console.log(`   ✓ KEEP: "${group.keep.text.slice(0, 80)}..."`);
      console.log(`   ✗ DELETE ${group.delete.length} entries:`);
      for (let j = 0; j < Math.min(3, group.delete.length); j++) {
        console.log(`      "${group.delete[j].text.slice(0, 80)}..."`);
      }
      if (group.delete.length > 3) {
        console.log(`      ... and ${group.delete.length - 3} more`);
      }
    }

    if (duplicates.length > 10) {
      console.log(`\n... and ${duplicates.length - 10} more duplicate groups`);
    }
  }

  // Delete duplicates
  if (toDelete.length > 0) {
    console.log(`\n🗑️  Deleting ${toDelete.length} duplicate memories...`);

    let deleted = 0;
    let failed = 0;

    for (const id of toDelete) {
      try {
        await table.delete(`id = '${id}'`);
        deleted++;
        if (deleted % 50 === 0) {
          console.log(`   Progress: ${deleted}/${toDelete.length} deleted...`);
        }
      } catch (error) {
        failed++;
        console.warn(`   ⚠️  Failed to delete ${id}: ${error}`);
      }
    }

    console.log(`\n✅ Cleanup complete:`);
    console.log(`   ✓ Deleted: ${deleted}`);
    console.log(`   ✗ Failed: ${failed}`);
    console.log(`   📊 Remaining: ${results.length - deleted}`);
  } else {
    console.log("\n✅ No duplicates found!");
  }
}

// Run the cleanup
cleanupDuplicates().catch(console.error);
