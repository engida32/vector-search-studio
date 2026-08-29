import { test, expect } from 'vitest';
import { embed, cosine, tokenize } from '../embedder';

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