#!/usr/bin/env node
/* Run semantic search locally without Postgres, using the same embedder and
 * seed data the app uses. Useful for demos/CI where a database isn't present. */
import { embed, cosine } from '../src/lib/embedder.ts';
import { seedDocuments } from '../src/lib/seed.ts';

const query = process.argv[2] ?? 'log in without a password (magic link)';
const topK = Number(process.argv[3] ?? 3);
const qv = embed(query);

const ranked = seedDocuments
  .map((doc) => ({ doc, score: cosine(qv, embed(`${doc.title} ${doc.body}`)) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, topK);

console.log(`query: "${query}" (top ${topK})\n`);
for (const { doc, score } of ranked) {
  console.log(`${score.toFixed(3)}  ${doc.title}`);
  console.log(`     ${doc.body}\n`);
}