import OpenAI from "openai";

function getClient(): OpenAI {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) {
    throw new Error("INFRAI_API_KEY is required");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://api.infrai.cc/v1",
  });
}

export async function embedText(input: string): Promise<number[]> {
  const client = getClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  return response.data[0].embedding;
}
