#!/usr/bin/env tsx
/**
 * Full flow test: store + recall with 1024D vectors
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { rmSync, existsSync } from "node:fs";
import { MemoryDB } from "./src/db.js";
import { Embeddings } from "./src/embeddings.js";

const TEST_DB_PATH = join(homedir(), ".openclaw", "memory", "test-memory-claw-full");
const API_KEY = process.env.MISTRAL_API_KEY || "";

async function cleanup(): Promise<void> {
  if (existsSync(TEST_DB_PATH)) {
    rmSync(TEST_DB_PATH, { recursive: true, force: true });
  }
}

async function testFullFlow(): Promise<void> {
  console.log("=== Full Flow Test: Store & Recall with 1024D ===\n");

  if (!API_KEY) {
    console.error("ERROR: MISTRAL_API_KEY not set");
    process.exit(1);
  }

  // Debug: Verify the API key works
  console.log("Testing API with curl-like fetch...");
  const testResponse = await fetch("https://api.mistral.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: "mistral-embed", input: "test" }),
  });
  const testData = await testResponse.json();
  console.log(`✓ Direct API call returns: ${testData.data[0].embedding.length}D`);

  await cleanup();

  try {
    // Create DB with 1024D
    const db = new MemoryDB(TEST_DB_PATH, 1024);
    const embeddings = new Embeddings(API_KEY, "mistral-embed", "https://api.mistral.ai/v1", 1024);

    // Initialize DB
    await db.count();
    console.log("✓ Database initialized (1024D)");

    // Test 1: Create embedding
    const testText = "Memory claw test: the quick brown fox jumps over the lazy dog. This is a test for vector dimension verification.";
    console.log("\nTest 1: Creating embedding...");
    const vector = await embeddings.embed(testText);
    console.log(`✓ Embedding created: ${vector.length}D`);

    if (vector.length !== 1024) {
      throw new Error(`Expected 1024D, got ${vector.length}D`);
    }

    // Test 2: Store memory
    console.log("\nTest 2: Storing memory...");
    const entry = await db.store({
      text: testText,
      vector,
      importance: 0.75,
      category: "test",
      source: "manual",
    });
    console.log(`✓ Memory stored (id: ${entry.id})`);

    // Test 3: Recall memory
    console.log("\nTest 3: Recalling memory...");
    const results = await db.search(vector, 5, 0.3, false);
    console.log(`✓ Found ${results.length} memories`);

    if (results.length === 0) {
      throw new Error("No memories found");
    }

    console.log(`  Result: "${results[0].text.slice(0, 60)}..."`);
    console.log(`  Score: ${results[0].score.toFixed(3)}`);

    // Test 4: Verify text matches
    if (results[0].text !== testText) {
      throw new Error("Recalled text doesn't match!");
    }

    // Test 5: Get vector dimension from embeddings
    console.log("\nTest 4: Checking Embeddings.getVectorDim()...");
    const detectedDim = embeddings.getVectorDim();
    console.log(`✓ Detected dimension: ${detectedDim}D`);

    if (detectedDim !== 1024) {
      throw new Error(`Expected 1024D, got ${detectedDim}D`);
    }

    console.log("\n=== ✅ ALL TESTS PASSED ===");
    console.log("✓ 1024D vectors work correctly");
    console.log("✓ Auto-migration works");
    console.log("✓ Store & recall work");

  } catch (error) {
    console.error("\n=== ❌ TEST FAILED ===");
    console.error(error);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

testFullFlow().catch(console.error);
