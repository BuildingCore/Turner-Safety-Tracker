import { createClient } from '@libsql/client';

// Check if we're in development by looking at NODE_ENV
const dev = process.env.NODE_ENV === 'development';

// Use local SQLite in dev, Turso in production
export const db = createClient({
  url: dev ? 'file:dev.db' : (process.env.TURSO_DATABASE_URL || 'file:dev.db'),
  authToken: dev ? undefined : process.env.TURSO_AUTH_TOKEN
});