/**
 * Self-contained embedding: hashing-trick bag-of-words with L2-normalization.
 *
 * No external API keys required, so the demo runs and is testable anywhere.
 * The vector schema is compatible with any real embedding model — swap the
 * tokenizer for e.g. a sentence-transformers or OpenAI embedding and the
 * pgvector column takes it unchanged.
 */

export type Embedding = number[];

const DIM = 384;

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
  const vec = new Array<number>(DIM).fill(0);
  for (const [token, count] of counts) {
    const index = fnv1a(token) % DIM;
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