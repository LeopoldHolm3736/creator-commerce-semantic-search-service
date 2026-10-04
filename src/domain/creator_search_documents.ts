export type DigitalAssetDelivery = {
  kind: "digital_asset";
  creatorId: string;
  contentId: string;
  title: string;
  summary: string;
  deliveryLabel: string;
  deliveryUrl: string;
  audienceTags: string[];
  publishedAt: string;
};

export type SubscriberUpdate = {
  kind: "subscriber_update";
  creatorId: string;
  contentId: string;
  title: string;
  summary: string;
  audienceTags: string[];
  publishedAt: string;
};

export type CreatorContent = DigitalAssetDelivery | SubscriberUpdate;

export type SearchDocument = {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
};

export function toSearchDocument(content: CreatorContent): SearchDocument {
  const id = `${content.creatorId}:${content.contentId}:${content.publishedAt}`;
  const commonText = [
    content.title,
    content.summary,
    content.audienceTags.join(" "),
    `published ${content.publishedAt}`,
  ];

  if (content.kind === "digital_asset") {
    return {
      id,
      text: [
        ...commonText,
        content.deliveryLabel,
        "instant download",
        "digital product",
      ].join(" | "),
      metadata: {
        category: content.kind,
        creatorId: content.creatorId,
        contentId: content.contentId,
        title: content.title,
        deliveryLabel: content.deliveryLabel,
        deliveryUrl: content.deliveryUrl,
        publishedAt: content.publishedAt,
      },
    };
  }

  return {
    id,
    text: [...commonText, "subscriber update", "member post"].join(" | "),
    metadata: {
      category: content.kind,
      creatorId: content.creatorId,
      contentId: content.contentId,
      title: content.title,
      publishedAt: content.publishedAt,
    },
  };
}
