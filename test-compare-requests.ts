#!/usr/bin/env tsx
/**
 * Compare requests from OpenAI client vs fetch
 */

import OpenAI from "openai";

const API_KEY = process.env.MISTRAL_API_KEY || "";

async function compareRequests() {
  console.log("Comparing OpenAI client vs fetch requests...\n");

  // Intercept fetch calls
  const originalFetch = global.fetch;
  let openaiRequest: { url: string; body: string } | null = null;

  global.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    const body = init?.body?.toString() || "";

    if (url.includes("mistral")) {
      openaiRequest = { url, body };
      console.log(`\nOpenAI client request:`);
      console.log(`  URL: ${url}`);
      console.log(`  Body: ${body}`);
    }

    return originalFetch(input, init);
  };

  // Test with OpenAI client
  const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: "https://api.mistral.ai/v1",
  });

  try {
    await client.embeddings.create({
      model: "mistral-embed",
      input: "test",
    });
  } catch (error) {
    // Ignore errors
  }

  global.fetch = originalFetch;

  // Test with fetch
  console.log(`\nFetch request:`);
  console.log(`  URL: https://api.mistral.ai/v1/embeddings`);
  console.log(`  Body: ${JSON.stringify({
    model: "mistral-embed",
    input: "test",
  }, null, 2)}`);
}

compareRequests().catch(console.error);
