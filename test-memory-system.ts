#!/usr/bin/env tsx
/**
 * Memory Claw Test Suite
 * Tests capture, recall, and database integrity
 */

import { MemoryDB } from "./src/db.js";
import { Embeddings } from "./src/embeddings.js";
import { readFileSync } from "fs";
import { join } from "path";

const DB_PATH = "./data/memories_claw.lance";
const VECTOR_DIM = 1024;

// Test configuration
const TEST_CONFIG = {
  apiKey: process.env.MISTRAL_API_KEY || "",
  model: "mistral-embed",
  baseUrl: "https://api.mistral.ai/v1",
};

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
  console.log("Memory Claw Test Suite");
  console.log("=====================\n");

  if (!TEST_CONFIG.apiKey) {
    console.error("Error: MISTRAL_API_KEY environment variable not set");
    process.exit(1);
  }

  // Initialize components
  const db = new MemoryDB(DB_PATH, VECTOR_DIM);
  const embeddings = new Embeddings(
    TEST_CONFIG.apiKey,
    TEST_CONFIG.model,
    TEST_CONFIG.baseUrl,
    VECTOR_DIM
  );

  // Test 1: Database Connection
  await runTest("Database Connection", async () => {
    const count = await db.count();
    console.log(`    Current memory count: ${count}`);
  });

  // Test 2: Embedding Generation
  await runTest("Embedding Generation", async () => {
    const testText = "The quick brown fox jumps over the lazy dog";
    const vector = await embeddings.embed(testText);
    if (vector.length !== VECTOR_DIM) {
      throw new Error(`Expected ${VECTOR_DIM}D vector, got ${vector.length}D`);
    }
    console.log(`    Generated ${vector.length}D embedding`);
  });

  // Test 3: Memory Capture (Store)
  await runTest("Memory Capture", async () => {
    const testText = `Test memory created at ${Date.now()}: User prefers TypeScript over JavaScript for large projects`;
    const vector = await embeddings.embed(testText);

    const entry = await db.store({
      text: testText,
      vector,
      importance: 0.8,
      category: "preference",
      source: "manual",
      tier: "episodic",
    });

    if (!entry.id) {
      throw new Error("Failed to store memory - no ID returned");
    }
    console.log(`    Stored memory with ID: ${entry.id.slice(0, 8)}...`);
  });

  // Test 4: Memory Recall (Search)
  await runTest("Memory Recall", async () => {
    const query = "TypeScript preference";
    const vector = await embeddings.embed(query);
    const results = await db.search(vector, 5, 0.3, true);

    if (results.length === 0) {
      throw new Error("No search results found");
    }
    console.log(`    Found ${results.length} memories`);
    console.log(`    Top result: "${results[0].text.slice(0, 60)}..."`);
  });

  // Test 5: Duplicate Detection
  await runTest("Duplicate Detection", async () => {
    const duplicateText = "Duplicate test: User prefers TypeScript over JavaScript";
    const vector = await embeddings.embed(duplicateText);

    // First, check if similar exists
    const results = await db.search(vector, 3, 0.90, false);
    console.log(`    Found ${results.length} similar memories for duplicate check`);

    if (results.length > 0) {
      console.log(`    Similarity score: ${results[0].score.toFixed(2)}`);
    }
  });

  // Test 6: Text Search
  await runTest("Text Search", async () => {
    const results = await db.textSearch("TypeScript", 5);
    console.log(`    Found ${results.length} memories matching "TypeScript"`);
  });

  // Test 7: Get Memory by Tier
  await runTest("Get Memory by Tier", async () => {
    const episodicMemories = await db.getByTier("episodic", 5);
    console.log(`    Found ${episodicMemories.length} episodic memories`);

    const coreMemories = await db.getByTier("core", 5);
    console.log(`    Found ${coreMemories.length} core memories`);
  });

  // Test 8: Database Statistics
  await runTest("Database Statistics", async () => {
    const stats = await db.getStats();
    console.log(`    Total memories: ${stats.count}`);
    console.log(`    Estimated size: ${(stats.estimatedSize / 1024).toFixed(2)} KB`);
  });

  // Test 9: Database Integrity - Schema Validation
  await runTest("Database Schema Validation", async () => {
    const memories = await db.getAll();
    if (memories.length === 0) {
      console.log(`    No memories to validate`);
      return;
    }

    let validCount = 0;
    let invalidCount = 0;

    for (const mem of memories) {
      const hasRequiredFields =
        mem.id && mem.text && mem.vector && mem.category && mem.tier;

      if (hasRequiredFields) {
        // Check vector dimension
        if (mem.vector.length !== VECTOR_DIM) {
          invalidCount++;
          console.warn(`    Invalid vector dimension: ${mem.vector.length}D (expected ${VECTOR_DIM}D)`);
        } else {
          validCount++;
        }
      } else {
        invalidCount++;
        console.warn(`    Missing required fields in memory ${mem.id}`);
      }
    }

    console.log(`    Valid memories: ${validCount}/${memories.length}`);
    console.log(`    Invalid memories: ${invalidCount}/${memories.length}`);

    if (invalidCount > 0) {
      throw new Error(`Found ${invalidCount} invalid memories`);
    }
  });

  // Test 10: Database Integrity - Tier Distribution
  await runTest("Tier Distribution", async () => {
    const memories = await db.getAll();
    const tiers = { episodic: 0, contextual: 0, core: 0 };

    for (const mem of memories) {
      tiers[mem.tier]++;
    }

    console.log(`    Episodic: ${tiers.episodic}`);
    console.log(`    Contextual: ${tiers.contextual}`);
    console.log(`    Core: ${tiers.core}`);
  });

  // Test 11: Database Integrity - Vector Consistency
  await runTest("Vector Consistency Check", async () => {
    const memories = await db.getAll();
    const sampleSize = Math.min(10, memories.length);

    if (memories.length === 0) {
      console.log(`    No memories to check`);
      return;
    }

    let inconsistent = 0;
    for (let i = 0; i < sampleSize; i++) {
      const mem = memories[i];
      if (mem.vector.length !== VECTOR_DIM) {
        inconsistent++;
      }
    }

    console.log(`    Checked ${sampleSize} memories`);
    console.log(`    Inconsistent vectors: ${inconsistent}`);

    if (inconsistent > 0) {
      throw new Error(`Found ${inconsistent} memories with inconsistent vector dimensions`);
    }
  });

  // Test 12: Metadata Cleaning (if applicable)
  await runTest("Metadata Quality Check", async () => {
    const memories = await db.getAll();
    const sampleSize = Math.min(20, memories.length);

    if (memories.length === 0) {
      console.log(`    No memories to check`);
      return;
    }

    let withMetadata = 0;
    let longTexts = 0;

    for (let i = 0; i < sampleSize; i++) {
      const mem = memories[i];

      // Check for potential metadata artifacts
      if (mem.text.includes("```") || mem.text.includes("```json") ||
          mem.text.includes('```')) {
        withMetadata++;
      }

      // Check for unusually long texts
      if (mem.text.length > 1000) {
        longTexts++;
      }
    }

    console.log(`    Checked ${sampleSize} memories`);
    console.log(`    With potential metadata artifacts: ${withMetadata}`);
    console.log(`    Unusually long texts (>1000 chars): ${longTexts}`);
  });

  // Final Report
  console.log("\n=====================");
  console.log("Test Summary");
  console.log("=====================\n");

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
  console.log(`  Memories: ${stats.count}`);
  console.log(`  Size: ${(stats.estimatedSize / 1024).toFixed(2)} KB`);
  console.log(`  Path: ${DB_PATH}`);
}

main().catch((error) => {
  console.error("Test suite failed:", error);
  process.exit(1);
});
