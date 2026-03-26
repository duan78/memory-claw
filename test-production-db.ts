#!/usr/bin/env tsx
/**
 * Memory Claw Production Database Test
 * Tests the production database at ~/.openclaw/memory/memory-claw/memories_claw.lance
 */

import { MemoryDB } from "./src/db.js";
import { join } from "path";
import { homedir } from "os";

const PRODUCTION_DB_PATH = join(homedir(), ".openclaw", "memory", "memory-claw", "memories_claw.lance");
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

async function main() {
  console.log("Memory Claw Production Database Test");
  console.log("=====================================\n");
  console.log(`Database Path: ${PRODUCTION_DB_PATH}\n`);

  // Initialize production database
  const db = new MemoryDB(PRODUCTION_DB_PATH, VECTOR_DIM);

  // Test 1: Database Connection
  await runTest("Database Connection", async () => {
    const count = await db.count();
    console.log(`    Total memories: ${count}`);
  });

  // Test 2: Database Statistics
  await runTest("Database Statistics", async () => {
    const stats = await db.getStats();
    console.log(`    Total memories: ${stats.count}`);
    console.log(`    Estimated size: ${(stats.estimatedSize / 1024).toFixed(2)} KB`);
    console.log(`    Average memory size: ${(stats.estimatedSize / stats.count).toFixed(2)} bytes`);
  });

  // Test 3: Tier Distribution
  await runTest("Tier Distribution", async () => {
    const memories = await db.getAll();
    const tiers = { episodic: 0, contextual: 0, core: 0 };
    const sources: Record<string, number> = {};
    const categories: Record<string, number> = {};

    for (const mem of memories) {
      tiers[mem.tier]++;
      sources[mem.source] = (sources[mem.source] || 0) + 1;
      categories[mem.category] = (categories[mem.category] || 0) + 1;
    }

    console.log(`    Tier distribution:`);
    console.log(`      Episodic: ${tiers.episodic} (${((tiers.episodic / memories.length) * 100).toFixed(1)}%)`);
    console.log(`      Contextual: ${tiers.contextual} (${((tiers.contextual / memories.length) * 100).toFixed(1)}%)`);
    console.log(`      Core: ${tiers.core} (${((tiers.core / memories.length) * 100).toFixed(1)}%)`);

    console.log(`    Source distribution:`);
    Object.entries(sources)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        const pct = ((count / memories.length) * 100).toFixed(1);
        console.log(`      ${source}: ${count} (${pct}%)`);
      });

    console.log(`    Category distribution (top 10):`);
    Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([cat, count]) => {
        const pct = ((count / memories.length) * 100).toFixed(1);
        console.log(`      ${cat}: ${count} (${pct}%)`);
      });
  });

  // Test 4: Schema Validation
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
        continue;
      }

      // Check vector dimension
      if (mem.vector.length !== VECTOR_DIM) {
        invalidCount++;
        issues.push(`Memory ${mem.id.slice(0, 8)}...: Invalid vector dimension ${mem.vector.length}D`);
        continue;
      }

      // Check tier validity
      if (!["episodic", "contextual", "core"].includes(mem.tier)) {
        invalidCount++;
        issues.push(`Memory ${mem.id.slice(0, 8)}...: Invalid tier "${mem.tier}"`);
        continue;
      }

      validCount++;
    }

    console.log(`    Valid memories: ${validCount}/${memories.length}`);
    console.log(`    Invalid memories: ${invalidCount}/${memories.length}`);

    if (issues.length > 0) {
      console.log(`    Sample issues (first 5):`);
      issues.slice(0, 5).forEach((issue) => console.log(`      - ${issue}`));
    }

    if (invalidCount > 0) {
      throw new Error(`Found ${invalidCount} invalid memories`);
    }
  });

  // Test 5: Vector Consistency
  await runTest("Vector Consistency", async () => {
    const memories = await db.getAll();
    const dims: Record<number, number> = {};
    let inconsistent = 0;

    for (const mem of memories) {
      const dim = mem.vector.length;
      dims[dim] = (dims[dim] || 0) + 1;

      if (dim !== VECTOR_DIM) {
        inconsistent++;
      }
    }

    console.log(`    Vector dimension distribution:`);
    Object.entries(dims)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([dim, count]) => {
        const pct = ((count / memories.length) * 100).toFixed(1);
        console.log(`      ${dim}D: ${count} (${pct}%)`);
      });

    console.log(`    Inconsistent vectors: ${inconsistent}/${memories.length}`);

    if (inconsistent > 0) {
      throw new Error(`Found ${inconsistent} memories with wrong vector dimensions`);
    }
  });

  // Test 6: Metadata Quality
  await runTest("Metadata Quality", async () => {
    const memories = await db.getAll();
    const sampleSize = Math.min(100, memories.length);

    let withMetadata = 0;
    let longTexts = 0;
    let emptyTexts = 0;
    let veryShortTexts = 0;
    let totalLength = 0;

    for (let i = 0; i < sampleSize; i++) {
      const mem = memories[i];
      totalLength += mem.text.length;

      if (mem.text.includes("```") || mem.text.includes("```json") ||
          mem.text.includes('"type":') || mem.text.includes('"content":')) {
        withMetadata++;
      }

      if (mem.text.length === 0) emptyTexts++;
      else if (mem.text.length < 20) veryShortTexts++;
      else if (mem.text.length > 1000) longTexts++;
    }

    const avgLength = totalLength / sampleSize;

    console.log(`    Sample size: ${sampleSize}/${memories.length}`);
    console.log(`    Average text length: ${avgLength.toFixed(0)} characters`);
    console.log(`    Empty texts: ${emptyTexts}`);
    console.log(`    Very short texts (<20 chars): ${veryShortTexts}`);
    console.log(`    Long texts (>1000 chars): ${longTexts}`);
    console.log(`    With metadata artifacts: ${withMetadata}`);

    if (emptyTexts > 0) {
      throw new Error(`Found ${emptyTexts} memories with empty text`);
    }
  });

  // Test 7: Importance Distribution
  await runTest("Importance Score Distribution", async () => {
    const memories = await db.getAll();
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
      const pct = ((count / memories.length) * 100).toFixed(1);
      console.log(`      ${range}: ${count} (${pct}%)`);
    });
  });

  // Test 8: Hit Count Analysis
  await runTest("Hit Count Analysis", async () => {
    const memories = await db.getAll();
    let totalHits = 0;
    let neverAccessed = 0;
    const distribution: Record<string, number> = {};

    for (const mem of memories) {
      const hits = mem.hitCount || 0;
      totalHits += hits;

      if (hits === 0) neverAccessed++;

      const range = hits === 0 ? "0" :
                    hits <= 5 ? "1-5" :
                    hits <= 10 ? "6-10" :
                    hits <= 20 ? "11-20" : "20+";
      distribution[range] = (distribution[range] || 0) + 1;
    }

    const avgHits = totalHits / memories.length;

    console.log(`    Never accessed: ${neverAccessed} (${((neverAccessed / memories.length) * 100).toFixed(1)}%)`);
    console.log(`    Average hits per memory: ${avgHits.toFixed(2)}`);
    console.log(`    Total hits: ${totalHits}`);
    console.log(`    Hit count distribution:`);
    Object.entries(distribution).sort().forEach(([range, count]) => {
      const pct = ((count / memories.length) * 100).toFixed(1);
      console.log(`      ${range}: ${count} (${pct}%)`);
    });
  });

  // Test 9: Age Distribution
  await runTest("Age Distribution", async () => {
    const memories = await db.getAll();
    const now = Date.now();
    const buckets = {
      "<1h": 0,
      "1h-24h": 0,
      "1d-7d": 0,
      "7d-30d": 0,
      ">30d": 0,
    };

    let totalAge = 0;

    for (const mem of memories) {
      const age = now - mem.createdAt;
      totalAge += age;

      const ageHours = age / (1000 * 60 * 60);
      const ageDays = age / (1000 * 60 * 60 * 24);

      if (ageHours < 1) buckets["<1h"]++;
      else if (ageHours < 24) buckets["1h-24h"]++;
      else if (ageDays < 7) buckets["1d-7d"]++;
      else if (ageDays < 30) buckets["7d-30d"]++;
      else buckets[">30d"]++;
    }

    const avgAge = totalAge / memories.length;
    const avgAgeDays = avgAge / (1000 * 60 * 60 * 24);

    console.log(`    Average age: ${avgAgeDays.toFixed(1)} days`);
    console.log(`    Age distribution:`);
    Object.entries(buckets).forEach(([range, count]) => {
      const pct = ((count / memories.length) * 100).toFixed(1);
      console.log(`      ${range}: ${count} (${pct}%)`);
    });
  });

  // Test 10: Search Functionality
  await runTest("Search Functionality", async () => {
    // Generate a mock vector for testing
    const mockVector = Array.from({ length: VECTOR_DIM }, () => Math.random() * 2 - 1);

    const results = await db.search(mockVector, 10, 0.0, false);

    console.log(`    Search returned ${results.length} results`);
    if (results.length > 0) {
      console.log(`    Top result score: ${results[0].score.toFixed(4)}`);
      console.log(`    Top result category: ${results[0].category}`);
      console.log(`    Top result tier: ${results[0].tier}`);
    }
  });

  // Test 11: Text Search
  await runTest("Text Search", async () => {
    const commonTerms = ["test", "user", "config", "memory", "plugin"];
    let totalResults = 0;

    for (const term of commonTerms) {
      const results = await db.textSearch(term, 5);
      totalResults += results.length;
    }

    console.log(`    Searched for ${commonTerms.length} common terms`);
    console.log(`    Total results: ${totalResults}`);
    console.log(`    Average results per term: ${(totalResults / commonTerms.length).toFixed(1)}`);
  });

  // Test 12: Recent Activity
  await runTest("Recent Activity", async () => {
    const memories = await db.getAll();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const recentMemories = memories.filter(m => m.createdAt > oneDayAgo);
    const recentUpdates = memories.filter(m => m.updatedAt > oneDayAgo);

    console.log(`    Memories created in last 24h: ${recentMemories.length}`);
    console.log(`    Memories updated in last 24h: ${recentUpdates.length}`);

    if (recentMemories.length > 0) {
      const sources: Record<string, number> = {};
      for (const mem of recentMemories) {
        sources[mem.source] = (sources[mem.source] || 0) + 1;
      }
      console.log(`    Recent sources:`);
      Object.entries(sources).forEach(([source, count]) => {
        console.log(`      ${source}: ${count}`);
      });
    }
  });

  // Final Report
  console.log("\n=====================================");
  console.log("Test Summary");
  console.log("=====================================\n");

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

  console.log("\nProduction Database Status:");
  const stats = await db.getStats();
  console.log(`  Path: ${PRODUCTION_DB_PATH}`);
  console.log(`  Memories: ${stats.count}`);
  console.log(`  Size: ${(stats.estimatedSize / 1024).toFixed(2)} KB`);
  console.log(`  Vector Dimension: ${VECTOR_DIM}D`);

  // Overall Health Assessment
  console.log("\n=====================================");
  console.log("Health Assessment");
  console.log("=====================================\n");

  const allMemories = await db.getAll();
  const coreMemories = allMemories.filter(m => m.tier === "core").length;
  const contextualMemories = allMemories.filter(m => m.tier === "contextual").length;
  const episodicMemories = allMemories.filter(m => m.tier === "episodic").length;

  let healthScore = 100;
  const issues: string[] = [];

  if (failed > 0) {
    healthScore -= failed * 10;
    issues.push(`${failed} failed tests`);
  }

  const emptyTexts = allMemories.filter(m => m.text.length === 0).length;
  if (emptyTexts > 0) {
    healthScore -= 10;
    issues.push(`${emptyTexts} memories with empty text`);
  }

  const wrongDim = allMemories.filter(m => m.vector.length !== VECTOR_DIM).length;
  if (wrongDim > 0) {
    healthScore -= 20;
    issues.push(`${wrongDim} memories with wrong vector dimensions`);
  }

  console.log(`Overall Health Score: ${healthScore}/100`);

  if (healthScore >= 90) {
    console.log("Status: ✓ Excellent");
  } else if (healthScore >= 70) {
    console.log("Status: ○ Good");
  } else if (healthScore >= 50) {
    console.log("Status: ⚠ Fair");
  } else {
    console.log("Status: ✗ Poor");
  }

  if (issues.length > 0) {
    console.log("\nIssues Found:");
    issues.forEach((issue) => console.log(`  - ${issue}`));
  } else {
    console.log("\nNo issues detected!");
  }

  console.log("\nKey Metrics:");
  console.log(`  Total Memories: ${allMemories.length}`);
  console.log(`  Core Memories: ${coreMemories} (${((coreMemories / allMemories.length) * 100).toFixed(1)}%)`);
  console.log(`  Contextual Memories: ${contextualMemories} (${((contextualMemories / allMemories.length) * 100).toFixed(1)}%)`);
  console.log(`  Episodic Memories: ${episodicMemories} (${((episodicMemories / allMemories.length) * 100).toFixed(1)}%)`);
}

main().catch((error) => {
  console.error("Test suite failed:", error);
  process.exit(1);
});
