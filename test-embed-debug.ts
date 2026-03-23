#!/usr/bin/env tsx
/**
 * Debug embedding dimension
 */

import OpenAI from "openai";

const API_KEY = process.env.MISTRAL_API_KEY || "";
const BASE_URL = "https://api.mistral.ai/v1";

async function testEmbed() {
  const client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });

  console.log("Testing embedding API...");
  console.log(`API Key: ${API_KEY.slice(0, 10)}...`);
  console.log(`Base URL: ${BASE_URL}`);

  const response = await client.embeddings.create({
    model: "mistral-embed",
    input: "test",
  });

  console.log(`\nResponse:`);
  console.log(`- Model: ${response.model}`);
  console.log(`- Object: ${response.object}`);
  console.log(`- Data length: ${response.data.length}`);
  console.log(`- Embedding dimension: ${response.data[0].embedding.length}`);
  console.log(`- First 5 values: ${response.data[0].embedding.slice(0, 5).map(v => v.toFixed(6)).join(", ")}`);
}

testEmbed().catch(console.error);
