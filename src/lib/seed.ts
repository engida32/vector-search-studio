export interface Document {
  id: number;
  title: string;
  body: string;
}

export const seedDocuments: Document[] = [
  {
    id: 1,
    title: 'CLI: Choose the location to connect to',
    body: 'Run supabase link --project-ref YOUR_PROJECT_REF to link your CLI session to a remote project, then the CLI can push migrations, run seed files, and manage secrets against that project.',
  },
  {
    id: 2,
    title: 'Postgres: enable the vector extension',
    body: 'CREATE EXTENSION vector; adds pgvector support. Store embeddings in a vector column and index them with an HNSW index for fast approximate nearest-neighbour search on millions of rows.',
  },
  {
    id: 3,
    title: 'Edge function: respond to a database webhook',
    body: 'Database webhooks fire on INSERT/UPDATE/DELETE. Attach the pg_net extension and a service-role token to relay changes to an edge function that runs your vectorization pipeline.',
  },
  {
    id: 4,
    title: 'Storage: upload files from a browser',
    body: 'Create a public bucket, set row-level security on storage.objects, and use the JavaScript client to upload and then generate signed URLs for private assets.',
  },
  {
    id: 5,
    title: 'Auth: send a magic link passwordless login',
    body: 'Enable magic link in the Auth providers panel. The client calls signInWithOtp; when the user opens the link their session is created and onAuthStateChange fires in the app.',
  },
  {
    id: 6,
    title: 'RAG: retrieve relevant chunks before answering',
    body: 'Chunk the source documents, embed each chunk with an embedding model, store the vectors in a vector column, then query with the user question embedded to retrieve the top-k most similar chunks.',
  },
];