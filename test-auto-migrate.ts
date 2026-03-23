#!/usr/bin/env tsx
/**
 * Test script for vector dimension auto-migration
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { rmSync, existsSync } from "node:fs";
import { MemoryDB } from "./src/db.js";
import { Embeddings } from "./src/embeddings.js";

// Test configuration
const TEST_DB_PATH = join(homedir(), ".openclaw", "memory", "test-memory-claw");
const API_KEY = process.env.MISTRAL_API_KEY || "";

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanup(): Promise<void> {
  if (existsSync(TEST_DB_PATH)) {
    console.log("Cleaning up test database...");
    rmSync(TEST_DB_PATH, { recursive: true, force: true });
  }
}

async function testAutoMigration(): Promise<void> {
  console.log("=== Vector Dimension Auto-Migration Test ===\n");

  if (!API_KEY) {
    console.error("ERROR: MISTRAL_API_KEY environment variable not set");
    process.exit(1);
  }

  // Clean up any existing test database
  await cleanup();

  try {
    // Step 1: Create a database with WRONG dimension (256D)
    console.log("Step 1: Creating database with WRONG dimension (256D)...");
    const dbWrong = new MemoryDB(TEST_DB_PATH, 256);
    const embeddingsWrong = new Embeddings(API_KEY, "mistral-embed");

    // Force initialization by calling count()
    await dbWrong.count();
    console.log("✓ Database created with 256D");

    // Step 2: Create a correct instance (1024D) and verify auto-migration
    console.log("\nStep 2: Creating new instance with CORRECT dimension (1024D)...");
    const dbCorrect = new MemoryDB(TEST_DB_PATH, 1024);
    const embeddingsCorrect = new Embeddings(API_KEY, "mistral-embed");

    // This should trigger auto-migration
    console.log("Calling count() to trigger auto-migration check...");
    await dbCorrect.count();
    console.log("✓ Auto-migration check completed");

    // Give it a moment
    await sleep(1000);

    // Step 3: Test storing a memory
    console.log("\nStep 3: Testing memory storage...");
    const testText = "This is a test memory for auto-migration verification. The quick brown fox jumps over the lazy dog.";
    const vector = await embeddingsCorrect.embed(testText);
    console.log(`Generated embedding vector dimension: ${vector.length}`);

    if (vector.length !== 1024) {
      throw new Error(`Expected 1024D vector, got ${vector.length}D`);
    }

    const entry = await dbCorrect.store({
      text: testText,
      vector,
      importance: 0.8,
      category: "test",
      source: "manual",
    });

    console.log(`✓ Memory stored successfully (id: ${entry.id})`);

    // Step 4: Test recall
    console.log("\nStep 4: Testing memory recall...");
    const results = await dbCorrect.search(vector, 5, 0.3, false);

    if (results.length === 0) {
      throw new Error("Expected to find the stored memory");
    }

    console.log(`✓ Found ${results.length} memories`);
    console.log(`  Result: "${results[0].text.slice(0, 50)}..." (score: ${results[0].score.toFixed(3)})`);

    // Verify the result matches
    if (results[0].text !== testText) {
      throw new Error("Recalled text doesn't match stored text");
    }

    console.log("\n=== ✅ ALL TESTS PASSED ===");
    console.log("Auto-migration is working correctly!");
    console.log("The database was automatically recreated with 1024D vectors");

  } catch (error) {
    console.error("\n=== ❌ TEST FAILED ===");
    console.error(error);
    process.exit(1);
  } finally {
    // Clean up
    await cleanup();
  }
}

// Run the test
testAutoMigration().catch(console.error);
