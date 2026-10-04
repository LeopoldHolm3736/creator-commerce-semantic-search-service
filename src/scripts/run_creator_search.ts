import { indexCreatorContent } from "../routes/index_creator_content";
import { searchCreatorCatalog } from "../routes/search_catalog";
import { infrai, InfraiError } from "../lib/infrai_client";

async function main() {
  const collection = `creator-commerce-demo-${crypto.randomUUID()}`;

  try {
    await indexCreatorContent({
      collection,
      content: {
        kind: "digital_asset",
        creatorId: "creator_42",
        contentId: "asset_100",
        title: "Night Drive LUT Pack",
        summary: "Cinematic color presets for neon streets, low light scenes, and moody travel reels.",
        deliveryLabel: "ZIP download",
        deliveryUrl: "https://example.com/downloads/night-drive-lut-pack.zip",
        audienceTags: ["video editing", "color grading", "night footage"],
        publishedAt: "2024-08-01T10:00:00.000Z",
      },
    });

    await indexCreatorContent({
      collection,
      content: {
        kind: "digital_asset",
        creatorId: "creator_42",
        contentId: "asset_101",
        title: "Podcast Intro Sample Pack",
        summary: "Short stingers, risers, and spoken word transitions for podcast producers.",
        deliveryLabel: "WAV bundle",
        deliveryUrl: "https://example.com/downloads/podcast-intro-sample-pack.zip",
        audienceTags: ["audio", "podcast", "samples"],
        publishedAt: "2024-08-03T12:30:00.000Z",
      },
    });

    await indexCreatorContent({
      collection,
      content: {
        kind: "subscriber_update",
        creatorId: "creator_42",
        contentId: "post_300",
        title: "August bonus drop",
        summary: "Members now get two extra teal-orange LUTs and a behind-the-scenes grading breakdown.",
        audienceTags: ["members", "bonus", "lut"],
        publishedAt: "2024-08-05T09:15:00.000Z",
      },
    });

    const result = await searchCreatorCatalog({
      collection,
      query: "cinematic LUT for night footage",
      topK: 3,
    });

    console.log(JSON.stringify(result, null, 2));
  } finally {
    try {
      await infrai.vector.collection.delete(collection);
    } catch (error) {
      if (!(error instanceof InfraiError) || error.status !== 404) {
        throw error;
      }
    }
    try {
      await infrai.vector.collection.get(collection);
      throw new Error(`Collection ${collection} still exists after deletion`);
    } catch (error) {
      if (!(error instanceof InfraiError) || error.status !== 404) {
        throw error;
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
