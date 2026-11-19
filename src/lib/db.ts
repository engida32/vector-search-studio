import { Pool } from 'pg';
import { getEmbedder } from './embedder';
import { seedDocuments, type Document } from './seed';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

const embedder = getEmbedder();

export async function createIndex(): Promise<void> {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE IF NOT EXISTS embedding_meta (
      id          TEXT PRIMARY KEY,
      dimension   INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      embedding   vector(${embedder.dimension})
    );
    CREATE INDEX IF NOT EXISTS documents_embedding_hnsw
      ON documents USING hnsw (embedding vector_cosine_ops);
  `);

  const { rows } = await pool.query<{ id: string; dimension: number }>(
    'SELECT id, dimension FROM embedding_meta LIMIT 1',
  );
  if (rows.length === 0) {
    await pool.query('INSERT INTO embedding_meta (id, dimension) VALUES ($1, $2)', [
      embedder.id,
      embedder.dimension,
    ]);
    return;
  }

  // Vectors from two providers are not comparable, and a different width cannot
  // even be stored in an existing column. Fail with the fix instead of serving
  // silently wrong neighbours.
  const [meta] = rows;
  if (meta.id !== embedder.id || meta.dimension !== embedder.dimension) {
    throw new Error(
      `documents were embedded with ${meta.id} (${meta.dimension} dims) but EMBEDDER now selects ` +
        `${embedder.id} (${embedder.dimension} dims); re-seed the documents table to switch providers`,
    );
  }
}

export async function seedIfEmpty(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM documents');
  if (Number(rows[0].count) > 0) return Number(rows[0].count);

  for (const doc of seedDocuments) {
    const vector = JSON.stringify(await embedder.embed(`${doc.title} ${doc.body}`));
    await pool.query(
      'INSERT INTO documents (title, body, embedding) VALUES ($1, $2, $3)',
      [doc.title, doc.body, vector],
    );
  }
  return seedDocuments.length;
}

export async function search(query: string, topK: number): Promise<Document[]> {
  const qv = JSON.stringify(await embedder.embed(query));
  const { rows } = await pool.query<Document & { id: number; title: string; body: string; distance: number }>(
    `SELECT id, title, body, embedding <=> $1::vector AS distance
       FROM documents
      ORDER BY distance
      LIMIT $2`,
    [qv, topK],
  );
  return rows.map((r) => ({ id: r.id, title: r.title, body: r.body }));
}
