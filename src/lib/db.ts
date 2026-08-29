import { Pool } from 'pg';
import { embed, type Embedding } from './embedder';
import { seedDocuments, type Document } from './seed';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

export async function createIndex(): Promise<void> {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE IF NOT EXISTS documents (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      embedding   vector(384)
    );
    CREATE INDEX IF NOT EXISTS documents_embedding_hnsw
      ON documents USING hnsw (embedding vector_cosine_ops);
  `);
}

export async function seedIfEmpty(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM documents');
  if (Number(rows[0].count) > 0) return Number(rows[0].count);

  for (const doc of seedDocuments) {
    const vector = JSON.stringify(embed(`${doc.title} ${doc.body}`));
    await pool.query(
      'INSERT INTO documents (title, body, embedding) VALUES ($1, $2, $3)',
      [doc.title, doc.body, vector],
    );
  }
  return seedDocuments.length;
}

export async function search(query: string, topK: number): Promise<Document[]> {
  const qv = JSON.stringify(embed(query));
  const { rows } = await pool.query<Document & { distance: number }>(
    `SELECT id, title, body, embedding <=> $1::vector AS distance
       FROM documents
      ORDER BY distance
      LIMIT $2`,
    [qv, topK],
  );
  return rows.map((r) => ({ id: r.id, title: r.title, body: r.body }));
}

export { embed };