import { describe, test, expect } from 'vitest';

const dsn = process.env.DATABASE_URL;

describe.skipIf(!dsn)('db against a real pgvector database', () => {
  test('creates the schema, seeds it, and returns the closest document', async () => {
    const { createIndex, seedIfEmpty, search } = await import('../db');
    await createIndex();
    const seeded = await seedIfEmpty();
    expect(seeded).toBeGreaterThan(0);

    const results = await search('postgres vector extension nearest neighbour', 3);
    expect(results).toHaveLength(3);
    expect(results[0].title).toBe('Postgres: enable the vector extension');
  });

  test('records the provider so a switch is refused instead of mixed', async () => {
    const { pool } = await import('../db');
    await pool.query("UPDATE embedding_meta SET id = 'some-other-model'");
    const { createIndex } = await import('../db');
    await expect(createIndex()).rejects.toThrow(/re-seed the documents table/);
    await pool.query("UPDATE embedding_meta SET id = 'hash-fnv1a-v1'");
    await pool.end();
  });
});
