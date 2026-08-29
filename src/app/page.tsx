'use client';

import { useState } from 'react';

interface Result {
  id: number;
  title: string;
  body: string;
}

const SAMPLES = [
  'connent CLI to a remote poject',
  'nearest neighbour search on stored embeddings',
  'upload a file from the browser',
  'log in without a password (magic link)',
  'get the best matching chunks for a question',
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(3);
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(q: string) {
    setQuery(q);
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&topK=${topK}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'request failed');
      setResults(data.results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '4rem auto', fontFamily: 'system-ui', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '2rem' }}>Vector Search Studio</h1>
      <p style={{ color: '#555' }}>
        Semantic search over Supabase docs with a real <code>pgvector</code> PostgreSQL database —
        HNSW index, cosine distance, typed results.
      </p>

      <div style={{ display: 'flex', gap: 8, margin: '1.5rem 0' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run(query)}
          placeholder="Try a typo-friendly query…"
          style={{ flex: 1, padding: '0.65rem', fontSize: '1rem' }}
        />
        <button onClick={() => run(query)} style={{ padding: '0.65rem 1.25rem', cursor: 'pointer' }}>
          Search
        </button>
      </div>

      <label style={{ fontSize: '0.85rem', color: '#666' }}>
        top-K&nbsp;
        <input
          type="number"
          min={1}
          max={10}
          value={topK}
          onChange={(e) => setTopK(Math.max(1, Math.min(10, Number(e.target.value))))}
          style={{ width: 60, padding: '0.25rem' }}
        />
      </label>

      <div style={{ margin: '1rem 0' }}>
        <b>Try:</b>{' '}
        {SAMPLES.map((s) => (
          <button
            key={s}
            onClick={() => run(s)}
            style={{ margin: '0.25rem', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            {s}
          </button>
        ))}
      </div>

      <p style={{ color: '#888', fontSize: '0.85rem' }}>
        Postgres unavailable? Run <code>docker compose up -d</code>, copy <code>.env.example</code> to{' '}
        <code>.env</code>, then search. The API falls back to a pure-Node<sup>ts</sup> cosine search
        otherwise, via <code>scripts/seed-local.mjs</code>.
      </p>

      {loading && <p>Searching…</p>}
      {error && <p style={{ color: '#c00' }}>{error}</p>}

      {results && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {results.length === 0 && <li>No results for that query.</li>}
          {results.map((r) => (
            <li key={r.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.75rem 1rem', margin: '0.5rem 0' }}>
              <b>{r.title}</b>
              <p style={{ margin: '0.35rem 0 0', color: '#444' }}>{r.body}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}