#!/usr/bin/env tsx
/**
 * Memory Claw Database Integrity Test
 * Tests database operations without requiring API keys
 */

import { MemoryDB } from "./src/db.js";

const DB_PATH = "./data/memories_claw.lance";
const VECTOR_DIM = 1024;

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    console.log(`✓ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration, error: errorMsg });
    console.log(`✗ ${name} (${duration}ms): ${errorMsg}`);
  }
}

function generateMockVector(dim: number): number[] {
  return Array.from({ length: dim }, () => Math.random() * 2 - 1);
}

async function main() {
  console.log("Memory Claw Database Integrity Test");
  console.log("====================================\n");

  // Initialize database
  const db = new MemoryDB(DB_PATH, VECTOR_DIM);

  // Test 1: Database Connection and Initialization
  await runTest("Database Connection", async () => {
    const count = await db.count();
    console.log(`    Current memory count: ${count}`);
  });

  // Test 2: Store a Test Memory
  await runTest("Store Test Memory", async () => {
    const testText = `Test memory ${Date.now()}: Database integrity check`;
    const vector = generateMockVector(VECTOR_DIM);

    const entry = await db.store({
      text: testText,
      vector,
      importance: 0.8,
      category: "test",
      source: "manual",
      tier: "episodic",
    });

    if (!entry.id) {
      throw new Error("Failed to store memory - no ID returned");
    }
    console.log(`    Stored memory with ID: ${entry.id.slice(0, 8)}...`);
  });

  // Test 3: Vector Search
  await runTest("Vector Search", async () => {
    const query = "database integrity test";
    const vector = generateMockVector(VECTOR_DIM);
    const results = await db.search(vector, 5, 0.0, false); // Set minScore to 0 for testing

    console.log(`    Found ${results.length} memories`);
    if (results.length > 0) {
      console.log(`    Top result: "${results[0].text.slice(0, 60)}..."`);
    }
  });

  // Test 4: Text Search
  await runTest("Text Search", async () => {
    const results = await db.textSearch("test", 10);
    console.log(`    Found ${results.length} memories matching "test"`);
  });

  // Test 5: Get Memory by Tier
  await runTest("Get Memory by Tier", async () => {
    const episodicMemories = await db.getByTier("episodic", 10);
    console.log(`    Found ${episodicMemories.length} episodic memories`);

    const coreMemories = await db.getByTier("core", 10);
    console.log(`    Found ${coreMemories.length} core memories`);

    const contextualMemories = await db.getByTier("contextual", 10);
    console.log(`    Found ${contextualMemories.length} contextual memories`);
  });

  // Test 6: Database Statistics
  await runTest("Database Statistics", async () => {
    const stats = await db.getStats();
    console.log(`    Total memories: ${stats.count}`);
    console.log(`    Estimated size: ${(stats.estimatedSize / 1024).toFixed(2)} KB`);
  });

  // Test 7: Schema Validation
  await runTest("Schema Validation", async () => {
    const memories = await db.getAll();
    if (memories.length === 0) {
      console.log(`    No memories to validate`);
      return;
    }

    let validCount = 0;
    let invalidCount = 0;
    const issues: string[] = [];

    for (const mem of memories) {
      const hasRequiredFields =
        mem.id && mem.text && mem.vector && mem.category && mem.tier;

      if (!hasRequiredFields) {
        invalidCount++;
        issues.push(`Memory ${mem.id}: Missing required fields`);
        continue;
      }

      // Check vector dimension
      if (mem.vector.length !== VECTOR_DIM) {
        invalidCount++;
        issues.push(`Memory ${mem.id}: Invalid vector dimension ${mem.vector.length}D (expected ${VECTOR_DIM}D)`);
        continue;
      }

      // Check tier validity
      if (!["episodic", "contextual", "core"].includes(mem.tier)) {
        invalidCount++;
        issues.push(`Memory ${mem.id}: Invalid tier "${mem.tier}"`);
        continue;
      }

      validCount++;
    }

    console.log(`    Valid memories: ${validCount}/${memories.length}`);
    console.log(`    Invalid memories: ${invalidCount}/${memories.length}`);

    if (issues.length > 0) {
      console.log(`    Issues:`);
      issues.slice(0, 5).forEach((issue) => console.log(`      - ${issue}`));
      if (issues.length > 5) {
        console.log(`      ... and ${issues.length - 5} more`);
      }
    }

    if (invalidCount > 0) {
      throw new Error(`Found ${invalidCount} invalid memories`);
    }
  });

  // Test 8: Tier Distribution Analysis
  await runTest("Tier Distribution Analysis", async () => {
    const memories = await db.getAll();
    const tiers = { episodic: 0, contextual: 0, core: 0 };
    const sources: Record<string, number> = {};
    const categories: Record<string, number> = {};

    for (const mem of memories) {
      tiers[mem.tier]++;
      sources[mem.source] = (sources[mem.source] || 0) + 1;
      categories[mem.category] = (categories[mem.category] || 0) + 1;
    }

    console.log(`    Total memories: ${memories.length}`);
    console.log(`    Tier distribution:`);
    console.log(`      Episodic: ${tiers.episodic} (${((tiers.episodic / memories.length) * 100).toFixed(1)}%)`);
    console.log(`      Contextual: ${tiers.contextual} (${((tiers.contextual / memories.length) * 100).toFixed(1)}%)`);
    console.log(`      Core: ${tiers.core} (${((tiers.core / memories.length) * 100).toFixed(1)}%)`);

    console.log(`    Source distribution:`);
    Object.entries(sources).forEach(([source, count]) => {
      console.log(`      ${source}: ${count}`);
    });

    console.log(`    Category distribution (top 5):`);
    Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([cat, count]) => {
        console.log(`      ${cat}: ${count}`);
      });
  });

  // Test 9: Vector Consistency Check
  await runTest("Vector Consistency Check", async () => {
    const memories = await db.getAll();
    const sampleSize = Math.min(50, memories.length);

    if (memories.length === 0) {
      console.log(`    No memories to check`);
      return;
    }

    let inconsistent = 0;
    const dims: Record<number, number> = {};

    for (let i = 0; i < sampleSize; i++) {
      const mem = memories[i];
      const dim = mem.vector.length;
      dims[dim] = (dims[dim] || 0) + 1;

      if (dim !== VECTOR_DIM) {
        inconsistent++;
      }
    }

    console.log(`    Checked ${sampleSize} memories`);
    console.log(`    Inconsistent vectors: ${inconsistent}`);
    console.log(`    Dimension distribution:`);
    Object.entries(dims).forEach(([dim, count]) => {
      console.log(`      ${dim}D: ${count}`);
    });

    if (inconsistent > 0) {
      throw new Error(`Found ${inconsistent} memories with inconsistent vector dimensions`);
    }
  });

  // Test 10: Metadata Quality Check
  await runTest("Metadata Quality Check", async () => {
    const memories = await db.getAll();
    const sampleSize = Math.min(50, memories.length);

    if (memories.length === 0) {
      console.log(`    No memories to check`);
      return;
    }

    let withMetadata = 0;
    let longTexts = 0;
    let emptyTexts = 0;
    let veryShortTexts = 0;
    let specialChars = 0;

    for (let i = 0; i < sampleSize; i++) {
      const mem = memories[i];

      // Check for potential metadata artifacts
      if (mem.text.includes("```") || mem.text.includes("```json") ||
          mem.text.includes('"type":') || mem.text.includes('"content":')) {
        withMetadata++;
      }

      // Check text length
      if (mem.text.length === 0) {
        emptyTexts++;
      } else if (mem.text.length < 20) {
        veryShortTexts++;
      } else if (mem.text.length > 1000) {
        longTexts++;
      }

      // Check for unusual special characters
      if (/[<>{}[\]\\]/.test(mem.text)) {
        specialChars++;
      }
    }

    console.log(`    Checked ${sampleSize} memories`);
    console.log(`    With potential metadata artifacts: ${withMetadata}`);
    console.log(`    Empty texts: ${emptyTexts}`);
    console.log(`    Very short texts (<20 chars): ${veryShortTexts}`);
    console.log(`    Long texts (>1000 chars): ${longTexts}`);
    console.log(`    With special characters: ${specialChars}`);

    if (emptyTexts > 0) {
      throw new Error(`Found ${emptyTexts} memories with empty text`);
    }
  });

  // Test 11: Import Score Distribution
  await runTest("Importance Score Distribution", async () => {
    const memories = await db.getAll();
    if (memories.length === 0) {
      console.log(`    No memories to analyze`);
      return;
    }

    const buckets = {
      "0.0-0.2": 0,
      "0.2-0.4": 0,
      "0.4-0.6": 0,
      "0.6-0.8": 0,
      "0.8-1.0": 0,
    };

    let totalImportance = 0;

    for (const mem of memories) {
      const imp = mem.importance;
      totalImportance += imp;

      if (imp < 0.2) buckets["0.0-0.2"]++;
      else if (imp < 0.4) buckets["0.2-0.4"]++;
      else if (imp < 0.6) buckets["0.4-0.6"]++;
      else if (imp < 0.8) buckets["0.6-0.8"]++;
      else buckets["0.8-1.0"]++;
    }

    const avgImportance = totalImportance / memories.length;

    console.log(`    Average importance: ${avgImportance.toFixed(3)}`);
    console.log(`    Distribution:`);
    Object.entries(buckets).forEach(([range, count]) => {
      console.log(`      ${range}: ${count} (${((count / memories.length) * 100).toFixed(1)}%)`);
    });
  });

  // Test 12: Hit Count Analysis
  await runTest("Hit Count Analysis", async () => {
    const memories = await db.getAll();
    if (memories.length === 0) {
      console.log(`    No memories to analyze`);
      return;
    }

    let totalHits = 0;
    let neverAccessed = 0;
    const distribution: Record<string, number> = {};

    for (const mem of memories) {
      const hits = mem.hitCount || 0;
      totalHits += hits;

      if (hits === 0) {
        neverAccessed++;
      }

      const range = hits === 0 ? "0" :
                    hits <= 5 ? "1-5" :
                    hits <= 10 ? "6-10" :
                    hits <= 20 ? "11-20" : "20+";
      distribution[range] = (distribution[range] || 0) + 1;
    }

    const avgHits = totalHits / memories.length;

    console.log(`    Total memories: ${memories.length}`);
    console.log(`    Never accessed: ${neverAccessed} (${((neverAccessed / memories.length) * 100).toFixed(1)}%)`);
    console.log(`    Average hits per memory: ${avgHits.toFixed(2)}`);
    console.log(`    Hit count distribution:`);
    Object.entries(distribution).sort().forEach(([range, count]) => {
      console.log(`      ${range}: ${count}`);
    });
  });

  // Final Report
  console.log("\n====================================");
  console.log("Test Summary");
  console.log("====================================\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log("\nFailed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }

  console.log("\nDatabase Status:");
  const stats = await db.getStats();
  console.log(`  Path: ${DB_PATH}`);
  console.log(`  Memories: ${stats.count}`);
  console.log(`  Size: ${(stats.estimatedSize / 1024).toFixed(2)} KB`);
  console.log(`  Vector Dimension: ${VECTOR_DIM}D`);
}

main().catch((error) => {
  console.error("Test suite failed:", error);
  process.exit(1);
});
