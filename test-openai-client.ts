#!/usr/bin/env tsx
/**
 * Debug OpenAI client behavior
 */

import OpenAI from "openai";

const API_KEY = process.env.MISTRAL_API_KEY || "";
const BASE_URL = "https://api.mistral.ai/v1";

async function testOpenAIClient() {
  console.log("Testing OpenAI client configuration...\n");

  // Test 1: Default configuration (should use OpenAI API)
  console.log("Test 1: No baseURL (default to OpenAI)");
  const client1 = new OpenAI({ apiKey: API_KEY });
  try {
    const response1 = await client1.embeddings.create({
      model: "mistral-embed",
      input: "test",
    });
    console.log(`  Result: ${response1.data[0].embedding.length}D`);
    console.log(`  Model: ${response1.model}`);
  } catch (error) {
    console.log(`  Error: ${error}`);
  }

  // Test 2: With baseURL (should use Mistral API)
  console.log("\nTest 2: With baseURL = Mistral");
  const client2 = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });
  try {
    const response2 = await client2.embeddings.create({
      model: "mistral-embed",
      input: "test",
    });
    console.log(`  Result: ${response2.data[0].embedding.length}D`);
    console.log(`  Model: ${response2.model}`);
    console.log(`  First 5 values: ${response2.data[0].embedding.slice(0, 5).map(v => v.toFixed(6)).join(", ")}`);
  } catch (error) {
    console.log(`  Error: ${error}`);
  }

  // Test 3: Check if there's an environment variable
  console.log("\nTest 3: Environment variables");
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "SET" : "NOT SET"}`);
  console.log(`  OPENAI_BASE_URL: ${process.env.OPENAI_BASE_URL || "NOT SET"}`);
}

testOpenAIClient().catch(console.error);
