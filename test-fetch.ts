#!/usr/bin/env tsx
/**
 * Test with fetch directly
 */

const API_KEY = process.env.MISTRAL_API_KEY || "";

async function testFetch() {
  const response = await fetch("https://api.mistral.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "mistral-embed",
      input: "test",
    }),
  });

  const data = await response.json();
  console.log(`Status: ${response.status}`);
  console.log(`Dimension: ${data.data[0].embedding.length}`);
  console.log(`First 5: ${data.data[0].embedding.slice(0, 5).map(v => v.toFixed(6)).join(", ")}`);
}

testFetch().catch(console.error);
