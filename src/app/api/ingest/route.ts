import { db } from '@/db'
import { chunks, destinations } from '@/db/schema'
import { allSections, destinations as corpus } from '@/data/destinations'
import { embedDocuments } from '@/lib/embed'

// The `pg` driver is Node-only — it cannot run on the edge runtime.
export const runtime = 'nodejs'

/**
 * Dev-only corpus ingest (spec decision 11).
 *
 * Reads the typed corpus in `src/data/destinations.ts`, embeds every prose
 * section, and replaces the contents of `destinations` + `chunks`.
 *
 * Runs inside Next rather than as a standalone script so that `@/` path
 * aliases resolve and this shares the exact same `db` client and `schema` as
 * the chat route. The tradeoff, recorded in the spec: ingest happens inside a
 * request, so a much larger corpus would eventually exceed the route timeout.
 * With 8 destinations x 5 sections = 40 chunks batched into a single embedding
 * call, this is nowhere near that ceiling.
 *
 * Idempotent: it deletes before inserting, so it is safe to re-run while
 * tuning the corpus. That is the normal workflow, not an edge case.
 */
export async function POST() {
  // This guard is load-bearing. Without it this is a public endpoint that
  // wipes and rewrites the database.
  if (process.env.NODE_ENV === 'production') {
    return new Response('Ingest is disabled outside development.\n', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const startedAt = Date.now()

  try {
    // Flatten the corpus into (destination, section) pairs first, so that
    // every section across every destination goes out in one batched
    // embedding request rather than one request per destination.
    const pending = corpus.flatMap((destination) =>
      allSections(destination).map(({ section, content }) => ({
        destinationSlug: destination.slug,
        section,
        content,
      })),
    )

    if (pending.length === 0) {
      return Response.json(
        { error: 'Corpus is empty — nothing to ingest.' },
        { status: 422 },
      )
    }

    const embeddedAt = Date.now()
    const embeddings = await embedDocuments(pending.map((p) => p.content))
    const embedMs = Date.now() - embeddedAt

    // embedDocuments guarantees order and length, but this mapping is only
    // safe because of that — assert rather than trust it silently.
    if (embeddings.length !== pending.length) {
      throw new Error(
        `Expected ${pending.length} embeddings, got ${embeddings.length}. ` +
          'Chunks are matched to embeddings by position.',
      )
    }

    const rows = pending.map((p, i) => ({ ...p, embedding: embeddings[i] }))

    // One transaction: a failure part-way through must not leave the corpus
    // half-replaced. Deleting destinations cascades to chunks via the FK.
    const counts = await db.transaction(async (tx) => {
      await tx.delete(chunks)
      await tx.delete(destinations)

      await tx.insert(destinations).values(
        corpus.map((d) => ({
          slug: d.slug,
          name: d.name,
          country: d.country,
          bestMonths: d.bestMonths,
          budgetTier: d.budgetTier,
          tags: d.tags,
        })),
      )

      await tx.insert(chunks).values(rows)

      return { destinations: corpus.length, chunks: rows.length }
    })

    return Response.json({
      ok: true,
      ...counts,
      dimensions: embeddings[0].length,
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
