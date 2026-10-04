import { describe, expect, it } from "vitest";
import { toSearchDocument } from "../src/domain/creator_search_documents";

describe("toSearchDocument", () => {
  it("builds a digital asset search document with stable id and delivery language", () => {
    const document = toSearchDocument({
      kind: "digital_asset",
      creatorId: "creator_42",
      contentId: "asset_100",
      title: "Night Drive LUT Pack",
      summary: "Cinematic color presets for neon streets.",
      deliveryLabel: "ZIP download",
      deliveryUrl: "https://example.com/downloads/night-drive-lut-pack.zip",
      audienceTags: ["video editing", "night footage"],
      publishedAt: "2024-08-01T10:00:00.000Z",
    });

    expect(document.id).toBe("creator_42:asset_100:2024-08-01T10:00:00.000Z");
    expect(document.text).toContain("instant download");
    expect(document.metadata.category).toBe("digital_asset");
    expect(document.metadata.deliveryUrl).toBe("https://example.com/downloads/night-drive-lut-pack.zip");
  });
});
