#!/usr/bin/env tsx
/**
 * Test what URL the OpenAI client is actually calling
 */

import OpenAI from "openai";

async function testActualURL() {
  console.log("Testing what URL OpenAI client actually calls...\n");

  // Create a custom fetch that logs the URL
  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    console.log(`Fetch called with URL: ${url}`);
    console.log(`Headers: ${JSON.stringify(init?.headers)}`);

    const response = await originalFetch(input, init);
    return response;
  };

  const client = new OpenAI({
    apiKey: "test-key",
    baseURL: "https://api.mistral.ai/v1",
  });

  try {
    await client.embeddings.create({
      model: "mistral-embed",
      input: "test",
    });
  } catch (error) {
    // We expect this to fail with invalid API key
  }

  global.fetch = originalFetch;
}

testActualURL().catch(console.error);
