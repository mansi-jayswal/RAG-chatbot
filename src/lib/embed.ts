/**
 * Embeddings via `gemini-embedding-2`, pinned to 1536 dimensions.
 *
 * WHY 1536 AND NOT THE MODEL'S 3072 DEFAULT — do not "helpfully" raise it:
 * pgvector's `vector` type cannot be HNSW-indexed above 2000 dimensions (an
 * index tuple has to fit inside Postgres's 8KB page). A `vector(3072)` column
 * fails at index creation with:
 *     ERROR: column cannot have more than 2000 dimensions for hnsw index
 * 1536 sits under that ceiling. It is also baked into the Drizzle schema and
 * into every row already stored, so changing it means a migration *and*
 * re-embedding the whole corpus.
 *
 * The model auto-renormalizes non-default dimensions, so no manual L2
 * normalization is needed before cosine search.
 *
 * NOTE ON `taskType`: `EmbedContentConfig` in @google/genai still declares
 * `taskType?: string`, because that config object is shared by every embedding
 * model the SDK supports (e.g. the older `text-embedding-004`). It is NOT a
 * parameter of `gemini-embedding-2` — task intent goes in the prompt text
 * instead — so it is deliberately not set here. Tutorials showing
 * `taskType: 'RETRIEVAL_DOCUMENT'` are targeting the older model.
 */

import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, getGeminiClient } from './gemini'

/**
 * `embedContent` returns one embedding per `Content` in `contents`, in order.
 * Batching matters: the dev-only ingest route embeds every section of every
 * destination inside a single HTTP request, and one API call per chunk would
 * push it past the route timeout.
 */
const BATCH_SIZE = 100

/** How many batch requests are allowed in flight at once. */
const MAX_CONCURRENT_BATCHES = 3

function assertDimensions(values: number[] | undefined, label: string): number[] {
  if (!values) {
    throw new Error(`Gemini returned an embedding with no values for ${label}.`)
  }
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dimension mismatch for ${label}: expected ${EMBEDDING_DIMENSIONS}, ` +
        `got ${values.length}. The chunks.embedding column is vector(${EMBEDDING_DIMENSIONS}), ` +
        'so inserting this would fail later as an opaque Postgres error. Check that ' +
        "`config.outputDimensionality` is still being sent and that the model id " +
        `('${EMBEDDING_MODEL}') still supports it.`,
    )
  }
  return values
}

async function embedBatch(texts: string[], offset: number): Promise<number[][]> {
  const ai = getGeminiClient()

  const response = await ai.models.embedContent({
    // Each input MUST be wrapped as its own `Content`. `ContentListUnion` is
    // `Content | Content[] | PartUnion | PartUnion[]`, and `string` is a
    // `PartUnion` — so a bare `string[]` is read as `PartUnion[]`, i.e. ONE
    // Content with many parts, and comes back as ONE embedding. Verified
    // against the live API: 3 bare strings -> 1 embedding; 3 wrapped
    // Contents -> 3 embeddings. This types fine either way, so the compiler
    // will not catch the mistake.
    model: EMBEDDING_MODEL,
    contents: texts.map((text) => ({ parts: [{ text }] })),
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  })

  const embeddings = response.embeddings

  if (!embeddings || embeddings.length !== texts.length) {
    throw new Error(
      `Gemini returned ${embeddings?.length ?? 0} embeddings for ${texts.length} inputs ` +
        `(batch starting at index ${offset}). Results are matched to inputs by position, ` +
        'so a count mismatch cannot be recovered from safely.',
    )
  }

  return embeddings.map((embedding, i) =>
    assertDimensions(embedding.values, `input ${offset + i}`),
  )
}

/**
 * Batch-embeds chunk text for ingest. Returns one 1536-float vector per input,
 * in the same order as `texts`.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  texts.forEach((text, i) => {
    if (text.trim().length === 0) {
      throw new Error(`Cannot embed empty text at index ${i}.`)
    }
  })

  const batches: { offset: number; texts: string[] }[] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push({ offset: i, texts: texts.slice(i, i + BATCH_SIZE) })
  }

  const results: number[][][] = new Array(batches.length)
  let next = 0

  async function worker(): Promise<void> {
    while (next < batches.length) {
      const index = next++
      const batch = batches[index]
      results[index] = await embedBatch(batch.texts, batch.offset)
    }
  }

  const workerCount = Math.min(MAX_CONCURRENT_BATCHES, batches.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  return results.flat()
}

/** Embeds a single user question at 1536 dimensions, for similarity search. */
export async function embedQuery(text: string): Promise<number[]> {
  if (text.trim().length === 0) {
    throw new Error('Cannot embed an empty query.')
  }

  const [embedding] = await embedBatch([text], 0)
  return embedding
}
