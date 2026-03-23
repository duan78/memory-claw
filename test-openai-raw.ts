import OpenAI from "openai";

const API_KEY = process.env.MISTRAL_API_KEY || "";

async function test() {
  const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: "https://api.mistral.ai/v1",
  });

  // Intercept the response
  const response = await client.embeddings.create({
    model: "mistral-embed",
    input: "test",
  } as any); // Cast to any to access internal properties

  console.log(`Raw response object:`, JSON.stringify(response, null, 2).slice(0, 500));
}

test().catch(console.error);
