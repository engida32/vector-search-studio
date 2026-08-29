import { NextResponse } from 'next/server';
import { createIndex, seedIfEmpty, search } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const topK = Math.min(Math.max(Number(searchParams.get('topK') ?? 3), 1), 10);

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not set. Run `docker compose up -d` and copy .env.example to .env.' },
      { status: 503 },
    );
  }

  try {
    await createIndex();
    await seedIfEmpty();
  } catch (err) {
    console.error('db setup failed:', err);
    return NextResponse.json({ error: 'database setup failed' }, { status: 500 });
  }

  const results = q ? await search(q, topK) : [];
  return NextResponse.json({ query: q, results });
}