import { test, expect } from 'vitest';
import { seedDocuments } from '../seed';

test('seed dataset is non-empty with unique ids', () => {
  const ids = new Set(seedDocuments.map((d) => d.id));
  expect(seedDocuments.length).toBeGreaterThan(0);
  expect(ids.size).toBe(seedDocuments.length);
});

test('every seeded document has a title and body', () => {
  for (const doc of seedDocuments) {
    expect(doc.title.length).toBeGreaterThan(0);
    expect(doc.body.length).toBeGreaterThan(0);
  }
});