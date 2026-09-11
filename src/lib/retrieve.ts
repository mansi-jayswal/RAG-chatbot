/**
 * Hybrid retrieval: cosine similarity over `chunks.embedding`, joined back to
 * `destinations` for the filterable metadata (spec decisions 6 and 7).
 *
 * Metadata is normalized — it lives only on `destinations` — so every filtered
 * search is a JOIN, and that is what makes the post-filtering trap below
 * unavoidable rather than merely annoying.
 */

import { and, cosineDistance, eq, sql, type SQL } from 'drizzle-orm'

import { db } from '@/db'
import { chunks, destinations } from '@/db/schema'
import { embedQuery } from '@/lib/embed'

/** Default top-k. Spec leaves the value to retrieval tuning; 5 is the start. */
const DEFAULT_K = 5

/**
 * `hnsw.ef_search` raised from its default of 40 for filtered queries.
 * Interpolated as a literal because Postgres `SET` does not accept bind
 * parameters — it is a module constant, never user input.
 */
const FILTERED_EF_SEARCH = 200

export type RetrieveOptions = {
  /** Top-k. Defaults to {@link DEFAULT_K}. */
  k?: number
  /** Exact match on `destinations.country`. */
  country?: string
  /** Matches when the month (1-12) is present in `destinations.best_months`. */
  month?: number
  /** Exact match on `destinations.budget_tier`. */
  budgetTier?: string
}

export type RetrievedChunk = {
  /** `chunks.id` — carried so a retrieval trace can be persisted later. */
  id: string
  slug: string
  name: string
  country: string
  budgetTier: string
  tags: string[]
  bestMonths: number[]
  section: string
  content: string
  /** Cosine similarity in [-1, 1]; higher is closer. */
  score: number
}

/**
 * Both `db` and a `db.transaction` callback's `tx` expose the same query
 * builder, so the search body is written once and handed whichever one the
 * caller needs. Derived from `db` itself rather than hand-importing
 * `NodePgTransaction` so it cannot drift from the client in `src/db/index.ts`.
 */
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

function buildFilters(opts: RetrieveOptions): SQL[] {
  const filters: SQL[] = []

  if (opts.country !== undefined) {
    filters.push(eq(destinations.country, opts.country))
  }

  if (opts.month !== undefined) {
    // `best_months` is integer[]; `= ANY(...)` is the array-membership test
    // that stays index-agnostic and takes the month as a bind parameter.
    filters.push(sql`${opts.month} = ANY(${destinations.bestMonths})`)
  }

  if (opts.budgetTier !== undefined) {
    filters.push(eq(destinations.budgetTier, opts.budgetTier))
  }

  return filters
}

function search(
  exec: Executor,
  embedding: number[],
  filters: SQL[],
  k: number,
): Promise<RetrievedChunk[]> {
  const distance = cosineDistance(chunks.embedding, embedding)
  const score = sql<number>`1 - (${distance})`

  return exec
    .select({
      id: chunks.id,
      slug: destinations.slug,
      name: destinations.name,
      country: destinations.country,
      budgetTier: destinations.budgetTier,
      tags: destinations.tags,
      bestMonths: destinations.bestMonths,
      section: chunks.section,
      content: chunks.content,
      score,
    })
    .from(chunks)
    .innerJoin(destinations, eq(chunks.destinationSlug, destinations.slug))
    .where(filters.length > 0 ? and(...filters) : undefined)
    // ORDER BY the raw distance ASCENDING, which is exactly equivalent to
    // ordering by `1 - distance` descending — but only this form can be
    // answered by the HNSW index. pgvector's index supports `ORDER BY col <=>
    // const` and nothing else: Postgres does no algebra on the sort key, so
    // `ORDER BY (1 - (col <=> const)) DESC` silently degrades to a sequential
    // scan plus in-memory sort over the whole table. The score is still
    // *selected* as `1 - distance`, so callers get similarity, not distance.
    .orderBy(distance)
    .limit(k)
}

/**
 * Retrieves the top-k chunks for `query`, with their parent destination's
 * metadata attached.
 *
 * ## Why filtered searches run inside a transaction
 *
 * pgvector POST-FILTERS. An HNSW scan fetches `hnsw.ef_search` candidate rows
 * (default **40**) from the index and only *then* applies `WHERE`. So on a
 * corpus that is 10% Japan, `WHERE country = 'Japan' ... LIMIT 5` can come
 * back with one row, or none — silently, with no error and no warning.
 *
 * The usual mitigation, a partial HNSW index per filter value, is not
 * available here: the filter columns live on `destinations` and a partial index
 * on `chunks` cannot reference another table (spec decision 7, accepted
 * limitation). What is left is `hnsw.iterative_scan = 'relaxed_order'`
 * (pgvector 0.8.0+; this server runs 0.8.6), which keeps pulling further
 * batches from the index until `LIMIT` is actually satisfied, plus a raised
 * `ef_search` so the first batch is less likely to be exhausted at all.
 *
 * Both are set with `SET LOCAL` inside an explicit transaction, never as a
 * session-wide `SET`. The `pg` Pool hands the same physical connection to
 * unrelated requests afterwards, so a session-wide setting would leak — every
 * later query on that connection would pay for iterative scanning it never
 * asked for. `SET LOCAL` is reverted when the transaction ends.
 *
 * Unfiltered searches skip the transaction entirely: with no `WHERE` there is
 * nothing to post-filter, so the default `ef_search` already returns k rows.
 */
export async function retrieve(
  query: string,
  opts: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const k = opts.k ?? DEFAULT_K

  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`retrieve: k must be a positive integer, got ${String(k)}.`)
  }

  const embedding = await embedQuery(query)
  const filters = buildFilters(opts)

  if (filters.length === 0) {
    return search(db, embedding, filters, k)
  }

  return db.transaction(async (tx) => {
    // `sql.raw` because `SET` takes no bind parameters. Both values are
    // compile-time constants in this module — nothing here is user input.
    await tx.execute(sql.raw("SET LOCAL hnsw.iterative_scan = 'relaxed_order'"))
    await tx.execute(sql.raw(`SET LOCAL hnsw.ef_search = ${FILTERED_EF_SEARCH}`))

    return search(tx, embedding, filters, k)
  })
}
