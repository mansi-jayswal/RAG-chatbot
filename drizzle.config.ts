import { defineConfig } from 'drizzle-kit'

// drizzle-kit does not read .env.local on its own. Node 24 can load it natively;
// in deployed environments the file is absent and DATABASE_URL is already set.
try {
  process.loadEnvFile('.env.local')
} catch {
  // no .env.local — fall through to the ambient environment
}

const url = process.env.DATABASE_URL

if (!url) {
  throw new Error('DATABASE_URL is not set (expected in .env.local)')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url },
})
