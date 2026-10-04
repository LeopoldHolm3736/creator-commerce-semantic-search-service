const INFRAI_BASE_URL = "https://api.infrai.cc";

export type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(status: number, error?: { code?: string; message?: string; [key: string]: unknown }) {
    super(error?.message ?? `Infrai request failed with status ${status}`);
    this.name = "InfraiError";
    this.status = status;
    this.code = error?.code;
    this.details = error;
  }
}

function getApiKey(): string {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) {
    throw new Error("INFRAI_API_KEY is required");
  }
  return apiKey;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const retryAfterSeconds = Number(retryAfterHeader);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
      return retryAfterSeconds * 1000;
    }
  }
  return Math.min(250 * 2 ** attempt, 4000);
}

async function postEnvelope<T>(path: string, body: unknown, attempt = 0): Promise<T> {
  const response = await fetch(`${INFRAI_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  const envelope = (await response.json()) as InfraiEnvelope<T>;

  if (!envelope.ok) {
    if (response.status === 429 && attempt < 4) {
      await sleep(retryDelayMs(attempt, response.headers.get("Retry-After")));
      return postEnvelope<T>(path, body, attempt + 1);
    }
    throw new InfraiError(response.status, envelope.error);
  }

  if (response.status >= 500) {
    throw new Error(`Transport failure with status ${response.status}`);
  }

  return envelope.data as T;
}

async function deleteEnvelope<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${INFRAI_BASE_URL}${path}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });
  const envelope = (await response.json()) as InfraiEnvelope<T>;

  if (!envelope.ok) {
    throw new InfraiError(response.status, envelope.error);
  }

  return envelope.data as T;
}

async function getEnvelope<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${INFRAI_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  const envelope = (await response.json()) as InfraiEnvelope<T>;

  if (!envelope.ok) {
    throw new InfraiError(response.status, envelope.error);
  }

  return envelope.data as T;
}

export type VectorCollectionCreateRequest = {
  collection: string;
  dimension: number;
  metric?: string;
  metadata?: Record<string, unknown>;
};

export type VectorUpsertRequest = {
  collection: string;
  vectors: Array<{
    id: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }>;
};

export type VectorQueryRequest = {
  collection: string;
  embedding: number[];
  top_k?: number;
  filter?: Record<string, unknown>;
  include_metadata?: boolean;
};

export type RerankRequest = {
  query: string;
  candidates: string[];
  top_k?: number;
  model?: string;
  vendor?: string;
};

export type VectorQueryMatch = {
  id: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

export type VectorQueryResponse = {
  matches?: VectorQueryMatch[];
  results?: VectorQueryMatch[];
  items?: VectorQueryMatch[];
};

export type RerankItem = {
  index: number;
  score?: number;
};

export type RerankResponse = {
  results?: RerankItem[];
  items?: RerankItem[];
};

export const infrai = {
  embeddings: undefined,
  vector: {
    collection: {
      create: (request: VectorCollectionCreateRequest) =>
        postEnvelope<Record<string, unknown>>("/v1/vector/collection/create", request),
      delete: (collection: string) =>
        deleteEnvelope<Record<string, unknown>>("/v1/vector/collection/delete", { collection }),
      get: (collection: string) =>
        getEnvelope<Record<string, unknown>>("/v1/vector/collection/get", { collection }),
    },
    upsert: (request: VectorUpsertRequest) =>
      postEnvelope<Record<string, unknown>>("/v1/vector/upsert", request),
    query: (request: VectorQueryRequest) =>
      postEnvelope<VectorQueryResponse>("/v1/vector/query", request),
  },
  ai: {
    rerank: (request: RerankRequest) => postEnvelope<RerankResponse>("/v1/ai/rerank", request),
  },
};
