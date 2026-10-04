import { z } from "zod";
import { embedText } from "../lib/embeddings_client";
import { infrai } from "../lib/infrai_client";
import { toSearchDocument } from "../domain/creator_search_documents";
import type { CreatorContent } from "../domain/creator_search_documents";

const digitalAssetSchema = z.object({
  kind: z.literal("digital_asset"),
  creatorId: z.string().min(1),
  contentId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  deliveryLabel: z.string().min(1),
  deliveryUrl: z.string().url(),
  audienceTags: z.array(z.string()).default([]),
  publishedAt: z.string().datetime(),
});

const subscriberUpdateSchema = z.object({
  kind: z.literal("subscriber_update"),
  creatorId: z.string().min(1),
  contentId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  audienceTags: z.array(z.string()).default([]),
  publishedAt: z.string().datetime(),
});

const indexRequestSchema = z.object({
  collection: z.string().min(1),
  dimension: z.number().int().positive().default(1536),
  content: z.union([digitalAssetSchema, subscriberUpdateSchema]),
});

export type IndexCreatorContentInput = z.input<typeof indexRequestSchema>;

export async function indexCreatorContent(input: IndexCreatorContentInput) {
  const parsed = indexRequestSchema.parse(input);
  const searchDocument = toSearchDocument(parsed.content as CreatorContent);
  const embedding = await embedText(searchDocument.text);

  await infrai.vector.collection.create({
    collection: parsed.collection,
    dimension: parsed.dimension,
    metric: "cosine",
    metadata: {
      domain: "creator-commerce",
    },
  });

  await infrai.vector.upsert({
    collection: parsed.collection,
    vectors: [
      {
        id: searchDocument.id,
        embedding,
        metadata: {
          ...searchDocument.metadata,
          document: searchDocument.text,
        },
      },
    ],
  });

  return {
    indexedId: searchDocument.id,
    category: searchDocument.metadata.category,
    title: searchDocument.metadata.title,
  };
}
