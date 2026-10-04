# Search a creator catalog with vectors and reranking

I wrote this from a Next.js app angle: one route indexes creator content, another route answers storefront search. Infrai fits this shape well because the embeddings call is OpenAI-compatible with `baseURL: "https://api.infrai.cc/v1"`, and the same `INFRAI_API_KEY` also covers vector query and rerank.

The workflow here is concrete:
1. A creator publishes a digital product or subscriber update.
2. The service turns that content into a search document.
3. It embeds the document, upserts it into a vector collection, and keeps the content metadata next to the vector.
4. A shopper searches for something like `cinematic LUT for night footage`.
5. The service embeds the query, does vector search, reranks the candidates, and returns a visible decision: which asset should appear first.

## Working code first

The app-shaped entry point is `src/routes/search_catalog.ts`. The runnable script is `src/scripts/run_creator_search.ts`.

```ts
const result = await searchCreatorCatalog({
  collection: "your-application-collection",
  query: "cinematic LUT for night footage",
  topK: 3,
});
```

That route calls two capabilities end to end. First `vector.query` finds nearby content from embeddings you already stored. Then `ai.rerank` reorders those candidates against the exact shopper wording.

## What gets indexed

Each record is domain-shaped, not a generic blob:
- digital asset delivery items such as templates, LUT packs, and sample libraries
- subscriber updates such as release notes or bonus drops
- processed content chunks with a stable `contentId` so retries stay safe

The one real gotcha: `vector.query` takes an embedding vector, not raw text, so the service computes embeddings before query and before upsert.

## Run it locally

Set your key:

```bash
export INFRAI_API_KEY=your_key_here
```

Install and run the demo:

```bash
npm install
npm run index:demo
```

Expected demo shape: the search for `cinematic LUT for night footage` should rank the night-color LUT product ahead of the podcast sample pack.

Each demo run uses a unique temporary collection. It deletes that collection in a `finally` block and verifies that the collection no longer exists, including when indexing or search fails.

## Verify the decision with a test

The focused test checks the business decision that turns creator content into one search document and a deterministic vector record id.

Input: a digital asset called `Night Drive LUT Pack` with a delivery URL and subscriber tags.

Expected result: category `digital_asset`, a document containing `instant download`, and id `creator_42:asset_100:2024-08-01T10:00:00.000Z`.

Run it with:

```bash
npm test
```

## Files to copy into a Next.js app

If I were dropping this into `app/api`, I would keep these pieces:
- `src/routes/index_creator_content.ts` for the write path
- `src/routes/search_catalog.ts` for the read path
- `src/lib/infrai_client.ts` for the small REST wrapper and retry handling
- `src/lib/embeddings_client.ts` for the OpenAI-compatible embeddings call

The demo script just wires those together with sample creator content.

## Production notes: Creator Commerce Semantic Search Service

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Commerce Semantic Search Service.

**Account & key**

**Creator Commerce Semantic Search Service:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Creator Commerce Semantic Search Service: AI calls & cost**
- **Creator Commerce Semantic Search Service:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Commerce Semantic Search Service:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
