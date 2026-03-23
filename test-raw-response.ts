#!/usr/bin/env tsx
/**
 * Test raw response from Mistral API
 */

async function testRawResponse() {
  const API_KEY = process.env.MISTRAL_API_KEY || "";

  console.log("Testing raw response from Mistral API...\n");

  const response = await fetch("https://api.mistral.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "mistral-embed",
      input: "test",
      encoding_format: "float",
    }),
  });

  const data = await response.json();
  console.log(`Status: ${response.status}`);
  console.log(`Model: ${data.model}`);
  console.log(`Dimension: ${data.data[0].embedding.length}`);
  console.log(`First value: ${data.data[0].embedding[0]}`);
  console.log(`All zero? ${data.data[0].embedding.every(v => v === 0)}`);
}

testRawResponse().catch(console.error);
