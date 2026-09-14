import { and, eq, inArray, notInArray, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { chunks, destinations } from '@/db/schema'
import { allSections, destinations as corpus } from '@/data/destinations'
import { embedDocuments } from '@/lib/embed'

// The `pg` driver is Node-only — it cannot run on the edge runtime.
export const runtime = 'nodejs'

/** Composite key for one chunk. Slugs and section names never contain a colon. */
const keyOf = (slug: string, section: string) => `${slug}::${section}`

/**
 * Dev-only corpus ingest (spec decision 11).
 *
 * Reads the typed corpus in `src/data/destinations.ts` and brings
 * `destinations` + `chunks` into line with it.
 *
 * **Incremental, per section.** Embedding is the only expensive part of this
 * route — a paid, rate-limited network call — so a section is re-embedded only
 * when its own prose has changed. Rewording one paragraph of one destination
 * costs exactly one embedding; the other chunks keep the vectors they have.
 * Adding ten destinations to a corpus of twenty costs fifty, not a hundred.
 *
 * Staleness is decided by comparing stored `content` against the corpus text.
 * That needs no extra column and no migration, and unlike a stored hash it
 * cannot drift out of sync with the thing it describes. Metadata (name, tags,
 * bestMonths, budgetTier) is always written, because it costs nothing and is
 * not part of the embedded text — so retagging a destination is free.
 *
 * `POST /api/ingest?force=1` re-embeds everything regardless. Use it after
 * changing the embedding model or its dimensions, where the stored vectors are
 * stale even though the prose is not.
 *
 * Runs inside Next rather than as a standalone script so that `@/` path
 * aliases resolve and this shares the exact same `db` client and `schema` as
 * the chat route. The tradeoff, recorded in the spec: ingest happens inside a
 * request, so a much larger corpus would eventually exceed the route timeout —
 * which incremental ingest also makes far less likely to bite.
 *
 * Idempotent: re-running with an unchanged corpus embeds nothing at all.
 */
export async function POST(request: Request) {
  // This guard is load-bearing. Without it this is a public endpoint that
  // rewrites the database.
  if (process.env.NODE_ENV === 'production') {
    return new Response('Ingest is disabled outside development.\n', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const startedAt = Date.now()
  const force = new URL(request.url).searchParams.has('force')

  try {
    if (corpus.length === 0) {
      return Response.json(
        { error: 'Corpus is empty — nothing to ingest.' },
        { status: 422 },
      )
    }

    // Deliberately does not select `embedding`: this only needs to know which
    // prose changed, and pulling 1536 floats per row to answer that would cost
    // more than the query saves.
    const existing = await db
      .select({
        slug: chunks.destinationSlug,
        section: chunks.section,
        content: chunks.content,
      })
      .from(chunks)

    const stored = new Map(
      existing.map((row) => [keyOf(row.slug, row.section), row.content]),
    )

    const desired = corpus.flatMap((destination) =>
      allSections(destination).map(({ section, content }) => ({
        destinationSlug: destination.slug,
        section,
        content,
      })),
    )
    const desiredKeys = new Set(
      desired.map((row) => keyOf(row.destinationSlug, row.section)),
    )

    // The chunks that actually need a vector.
    const pending = force
      ? desired
      : desired.filter(
          (row) =>
            stored.get(keyOf(row.destinationSlug, row.section)) !== row.content,
        )

    // Sections that used to exist and no longer appear in the corpus. Chunks of
    // wholly deleted destinations are handled by the FK cascade below.
    const orphans = existing.filter(
      (row) => !desiredKeys.has(keyOf(row.slug, row.section)),
    )

    // Destinations the corpus no longer describes at all.
    const removed = await db
      .select({ slug: destinations.slug })
      .from(destinations)
      .where(
        notInArray(
          destinations.slug,
          corpus.map((d) => d.slug),
        ),
      )

    let embedMs = 0
    let dimensions: number | null = null
    let rows: ((typeof pending)[number] & { embedding: number[] })[] = []

    if (pending.length > 0) {
      const embeddedAt = Date.now()
      const embeddings = await embedDocuments(pending.map((p) => p.content))
      embedMs = Date.now() - embeddedAt

      // embedDocuments guarantees order and length, but this mapping is only
      // safe because of that — assert rather than trust it silently.
      if (embeddings.length !== pending.length) {
        throw new Error(
          `Expected ${pending.length} embeddings, got ${embeddings.length}. ` +
            'Chunks are matched to embeddings by position.',
        )
      }

      dimensions = embeddings[0].length
      rows = pending.map((p, i) => ({ ...p, embedding: embeddings[i] }))
    }

    // One transaction: a partial write must not leave the corpus half-updated.
    await db.transaction(async (tx) => {
      if (removed.length > 0) {
        await tx.delete(destinations).where(
          inArray(
            destinations.slug,
            removed.map((r) => r.slug),
          ),
        )
      }

      // Metadata is cheap and is not part of the embedded text, so it is always
      // brought up to date — even where the prose is unchanged.
      await tx
        .insert(destinations)
        .values(
          corpus.map((d) => ({
            slug: d.slug,
            name: d.name,
            country: d.country,
            bestMonths: d.bestMonths,
            budgetTier: d.budgetTier,
            tags: d.tags,
          })),
        )
        .onConflictDoUpdate({
          target: destinations.slug,
          set: {
            name: sql`excluded.name`,
            country: sql`excluded.country`,
            bestMonths: sql`excluded.best_months`,
            budgetTier: sql`excluded.budget_tier`,
            tags: sql`excluded.tags`,
          },
        })

      // Replaced and orphaned chunks go in a single delete, addressed by
      // (destination, section) so untouched siblings keep their vectors.
      const doomed = [
        ...pending.map((p) => ({ slug: p.destinationSlug, section: p.section })),
        ...orphans.map((o) => ({ slug: o.slug, section: o.section })),
      ]

      if (doomed.length > 0) {
        await tx
          .delete(chunks)
          .where(
            or(
              ...doomed.map((d) =>
                and(
                  eq(chunks.destinationSlug, d.slug),
                  eq(chunks.section, d.section),
                ),
              ),
            ),
          )
      }

      if (rows.length > 0) await tx.insert(chunks).values(rows)
    })

    const touched = new Set(pending.map((p) => p.destinationSlug))

    return Response.json({
      ok: true,
      mode: force ? 'force' : 'incremental',
      destinations: corpus.length,
      embedded: { destinations: touched.size, chunks: rows.length },
      unchanged: { chunks: desired.length - rows.length },
      orphanedChunksRemoved: orphans.length,
      removedDestinations: removed.map((r) => r.slug),
      dimensions,
      embedMs,
      totalMs: Date.now() - startedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // Surface the real message. The errors thrown by embed.ts and gemini.ts
    // are written to be actionable, and hiding them behind a generic 500
    // would waste that.
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
