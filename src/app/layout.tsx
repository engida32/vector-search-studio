import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vector Search Studio',
  description: 'Typo-tolerant semantic search on Supabase docs with pgvector (HNSW, cosine distance).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}