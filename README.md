# Vector Search Studio

A semantic-search reference app: typo-tolerant retrieval over Supabase docs using a **pgvector**-backed PostgreSQL database, an HNSW index, and cosine distance — with a React/TypeScript UI, tests, and CI.

Built by Engida Lishan as a public artifact for full-stack / AI-engineer applications.

## What it demonstrates

- **pgvector** in production shapes: `vector(384)` column, HNSW cosine index, `<=>` distance queries
- **Typo-tolerant semantic search** (no keyword matching) — try the sample queries
- **React + TypeScript + Next.js (App Router)** typed API → UI
- **Tests + CI**: Vitest unit tests for the embedder and seed data, plus typecheck, lint, and a no-Postgres smoke test in GitHub Actions

## Embeddings

The default embedder is deliberately **self-contained** (a signed random-projection hashing trick over normalized tokens) so the demo runs anywhere with zero API keys. It produces an L2-normalized `584`... no — a **384-dimension** vector that drops straight into the `vector(384)` column. Swap the tokenizer for any real embedding model (OpenAI, sentence-transformers…) and the schema and queries don't change.

## Run it

### 1. Postgres with pgvector (Docker)

```bash
docker compose up -d
cp .env.example .env
```

### 2. App

```bash
npm install
npm run dev
```

Open http://localhost:3000. Seeding and table/extension creation happen automatically on the first search.

### No Postgres? Use the local fallback

```bash
npm run test                       # embedder + seed unit tests
node --experimental-strip-types scripts/seed-local.mjs "get the best matching chunks for a question" 3
```

## Schema (auto-created by the API on first query)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id        SERIAL PRIMARY KEY,
  title     TEXT NOT NULL,
  body      TEXT NOT NULL,
  embedding vector(384)
);

CREATE INDEX documents_embedding_hnsw
  ON documents USING hnsw (embedding vector_cosine_ops);
```

## CI

`.github/workflows/ci.yml` runs on every push/PR: `typecheck → lint → vitest → local search smoke test`.

---

If you change the embedding dimension, update `DIM` in `src/lib/embedder.ts` **and** the `vector(384)` column in the schema SQL above.