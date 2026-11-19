import { test, expect } from 'vitest';
import {
  embed,
  cosine,
  tokenize,
  getEmbedder,
  hashEmbedder,
  openaiEmbedder,
  OPENAI_DIM,
  type FetchLike,
} from '../embedder';

test('embedding has fixed dimension equal to the pgvector column', () => {
  expect(embed('semantic search')).toHaveLength(384);
});

test('embedding is L2-normalized, so cosine is a pure angle', () => {
  const v = embed('normalize me');
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  expect(norm).toBeCloseTo(1, 5);
});

test('similar texts embed closer than dissimilar texts', () => {
  const a = embed('postgres vector extension nearest neighbour');
  const b = embed('postgres vector extension nearest neighbour');
  const c = embed('upload a file to the browser storage bucket');
  expect(cosine(a, b)).toBeCloseTo(1, 4);
  expect(cosine(a, c)).toBeLessThan(cosine(a, b));
});

test('tokenizer is case-insensitive and strips punctuation', () => {
  expect(tokenize('SkyBRIDGE, & Docker!')).toEqual(['skybridge', 'docker']);
});

test('empty input yields a zero vector, not a crash', () => {
  expect(embed('!!')).toEqual(new Array(384).fill(0));
});

test('deterministic across calls', () => {
  expect(embed('deterministic embedding across calls')).toEqual(embed('deterministic embedding across calls'));
});
test('the default provider is the offline hashing embedder', () => {
  const provider = getEmbedder({});
  expect(provider.id).toBe(hashEmbedder.id);
  expect(provider.dimension).toBe(384);
  expect(provider.embed).toBeTypeOf('function');
});

test('an unknown EMBEDDER value fails loudly instead of falling back', () => {
  expect(() => getEmbedder({ EMBEDDER: 'cohere' })).toThrow(/unknown EMBEDDER/);
});

test('selecting openai without a key fails loudly', () => {
  expect(() => getEmbedder({ EMBEDDER: 'openai' })).toThrow(/OPENAI_API_KEY/);
});

test('the openai provider sends the text and returns the vector', async () => {
  const calls: { url: string; init: { method: string; headers: Record<string, string>; body: string } }[] = [];
  const doFetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }) };
  };

  const provider = openaiEmbedder('sk-test', doFetch);
  expect(provider.dimension).toBe(OPENAI_DIM);
  expect(await provider.embed('postgres')).toEqual([0.1, 0.2]);

  expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe('https://api.openai.com/v1/embeddings');
  expect(calls[0].init.headers.Authorization).toBe('Bearer sk-test');
  expect(JSON.parse(calls[0].init.body)).toEqual({
    model: 'text-embedding-3-small',
    input: 'postgres',
  });
});

test('an openai error status surfaces the status code', async () => {
  const doFetch: FetchLike = async () => ({ ok: false, status: 401, json: async () => ({}) });
  await expect(openaiEmbedder('sk-bad', doFetch).embed('x')).rejects.toThrow(/status 401/);
});
