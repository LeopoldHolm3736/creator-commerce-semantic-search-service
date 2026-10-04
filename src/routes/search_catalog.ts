import { z } from "zod";
import { embedText } from "../lib/embeddings_client";
import { infrai } from "../lib/infrai_client";

const searchRequestSchema = z.object({
  collection: z.string().min(1),
  query: z.string().min(1),
  topK: z.number().int().positive().max(10).default(5),
  category: z.enum(["digital_asset", "subscriber_update"]).optional(),
});

export type SearchCreatorCatalogInput = z.input<typeof searchRequestSchema>;

export type SearchHit = {
  id: string;
  title?: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

function pickMatches(payload: { matches?: SearchHit[]; results?: SearchHit[]; items?: SearchHit[] }) {
  return payload.matches ?? payload.results ?? payload.items ?? [];
}

export async function searchCreatorCatalog(input: SearchCreatorCatalogInput) {
  const parsed = searchRequestSchema.parse(input);
  const embedding = await embedText(parsed.query);

  const vectorResponse = await infrai.vector.query({
    collection: parsed.collection,
    embedding,
    top_k: parsed.topK,
    include_metadata: true,
    filter: parsed.category ? { category: parsed.category } : undefined,
  });

  const rawMatches = pickMatches(vectorResponse as { matches?: SearchHit[]; results?: SearchHit[]; items?: SearchHit[] });

  const candidates = rawMatches.map((match) => String(match.metadata?.document ?? match.title ?? ""));
  const rerankResponse = await infrai.ai.rerank({
    query: parsed.query,
    candidates,
    top_k: parsed.topK,
    model: "cohere-rerank-3.5",
    vendor: "cohere",
  });

  const rerankItems = rerankResponse.results ?? rerankResponse.items ?? [];
  const reranked = rerankItems.map((item) => {
    const match = rawMatches[item.index];
    return {
      id: match.id,
      title: String(match.metadata?.title ?? "untitled"),
      category: String(match.metadata?.category ?? "unknown"),
      document: String(match.metadata?.document ?? ""),
      score: item.score,
    };
  });

  return {
    query: parsed.query,
    results: reranked,
  };
}
