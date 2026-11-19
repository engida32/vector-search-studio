/**
 * Embedding providers behind one interface.
 *
 * The hashing embedder needs no keys or network, so the demo runs anywhere and
 * stays testable. The OpenAI provider is the same interface with a real model:
 * HTTP in, vector out. The pgvector column is sized from the provider, so
 * switching providers requires a re-seed rather than mixing widths.
 */

export type Embedding = number[];

export type Embedder = {
  id: string;
  dimension: number;
  embed(text: string): Promise<Embedding>;
};

const HASH_DIM = 384;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// Deterministic 32-bit hash (FNV-1a) so the same token always lands on the
// same dimension, in any runtime or process.
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function hashSign(seed: number, token: string): number {
  return fnv1a(`${seed}:${token}`) % 2 === 0 ? 1 : -1;
}

export function embed(text: string): Embedding {
  const counts = new Map<string, number>();
  for (const tok of tokenize(text)) counts.set(tok, (counts.get(tok) ?? 0) + 1);

  // Signed random-projection hashing: 2 hashes per token produce a sparse
  // sign-flipped value, giving angular (cosine) similarity between texts that
  // share vocabulary — a lightweight stand-in for dense semantic embeddings.
  const vec = new Array<number>(HASH_DIM).fill(0);
  for (const [token, count] of counts) {
    const index = fnv1a(token) % HASH_DIM;
    vec[index] += count * hashSign(1, token);
  }

  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export function cosine(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) throw new Error(`dimension mismatch: ${a.length} vs ${b.length}`);
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export const hashEmbedder: Embedder = {
  id: 'hash-fnv1a-v1',
  dimension: HASH_DIM,
  embed: async (text) => embed(text),
};

export type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export const OPENAI_MODEL = 'text-embedding-3-small';
export const OPENAI_DIM = 1536;

export function openaiEmbedder(
  apiKey: string | undefined,
  doFetch: FetchLike = fetch as unknown as FetchLike,
  model: string = OPENAI_MODEL,
): Embedder {
  if (!apiKey) throw new Error('EMBEDDER=openai requires OPENAI_API_KEY');

  return {
    id: `openai-${model}`,
    dimension: OPENAI_DIM,
    embed: async (text) => {
      const response = await doFetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, input: text }),
      });
      if (!response.ok) {
        throw new Error(`OpenAI embeddings failed with status ${response.status}`);
      }
      const payload = (await response.json()) as { data?: { embedding?: number[] }[] };
      const vector = payload.data?.[0]?.embedding;
      if (!vector) throw new Error('OpenAI embeddings returned no vector');
      return vector;
    },
  };
}

export function getEmbedder(env: Record<string, string | undefined> = process.env): Embedder {
  const kind = (env.EMBEDDER ?? 'hash').toLowerCase();
  if (kind === 'hash') return hashEmbedder;
  if (kind === 'openai') return openaiEmbedder(env.OPENAI_API_KEY);
  throw new Error(`unknown EMBEDDER: ${kind} (expected hash or openai)`);
}
