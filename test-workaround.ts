#!/usr/bin/env tsx
/**
 * Test workaround using custom fetch
 */

import OpenAI from "openai";

const API_KEY = process.env.MISTRAL_API_KEY || "";

async function testWorkaround() {
  console.log("Testing workaround with custom fetch...\n");

  // Create a custom fetch that removes encoding_format
  const originalFetch = global.fetch;
  const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as Request).url || String(input);

    // Only intercept Mistral API calls
    if (url.includes("api.mistral.ai")) {
      let body = init?.body;
      if (typeof body === 'string') {
        const parsed = JSON.parse(body);
        // Remove encoding_format to get float response
        delete parsed.encoding_format;
        delete parsed.dimensions;
        body = JSON.stringify(parsed);
      }

      const response = await originalFetch(input, {
        ...init,
        body,
      } as RequestInit);

      return response;
    }

    return originalFetch(input, init);
  };

  // Test with custom fetch
  const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: "https://api.mistral.ai/v1",
    fetch: customFetch as any,
  });

  const response = await client.embeddings.create({
    model: "mistral-embed",
    input: "test",
  });

  console.log(`✓ Embedding dimension: ${response.data[0].embedding.length}`);
  console.log(`✓ First value: ${response.data[0].embedding[0].toFixed(6)}`);
  console.log(`✓ All zero? ${response.data[0].embedding.every((v: number) => v === 0)}`);
}

testWorkaround().catch(console.error);
