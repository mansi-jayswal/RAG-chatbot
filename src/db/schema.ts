import {
  index,
  integer,
  pgTable,
  text,
  uuid,
  vector,
} from 'drizzle-orm/pg-core'

/**
 * Filterable metadata lives here and only here (spec decision 7 — normalized).
 * Filtered similarity searches JOIN from `chunks` back to this table.
 */
export const destinations = pgTable('destinations', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  bestMonths: integer('best_months').array().notNull(),
  budgetTier: text('budget_tier').notNull(),
  tags: text('tags').array().notNull(),
})

/**
 * One row per hand-authored prose section (spec decision 6).
 * `embedding` is vector(1536) — gemini-embedding-2 at 1536 dims (decision 3),
 * safely under pgvector's 2000-dimension HNSW ceiling.
 */
export const chunks = pgTable(
  'chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    destinationSlug: text('destination_slug')
      .notNull()
      .references(() => destinations.slug, { onDelete: 'cascade' }),
    section: text('section').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  },
  (t) => [
    index('chunks_embedding_idx').using(
      'hnsw',
      t.embedding.op('vector_cosine_ops'),
    ),
    index('chunks_destination_slug_idx').on(t.destinationSlug),
  ],
)

export type Destination = typeof destinations.$inferSelect
export type NewDestination = typeof destinations.$inferInsert
export type Chunk = typeof chunks.$inferSelect
export type NewChunk = typeof chunks.$inferInsert
