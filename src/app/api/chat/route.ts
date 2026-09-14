/**
 * POST /api/chat — retrieve → build a grounded prompt → stream Gemini's answer.
 *
 * WIRE CONTRACT (the client in `src/app/page.tsx` is written against this):
 *   request  : { messages: { role: 'user' | 'assistant', content: string }[] }
 *   success  : 200, `Content-Type: text/plain; charset=utf-8`
 *              body = RAW streamed UTF-8 text. Not SSE, not JSON lines — the
 *              client can append every chunk straight to the message.
 *              header `X-Rag-Sources` = encodeURIComponent(JSON.stringify(
 *                { slug, name, section, score }[]))
 *   failure  : non-200 with a plain-text body. 400 for a bad request, 500 for
 *              a retrieval/generation failure (the message is passed through —
 *              the one from `gemini.ts` is already actionable).
 *
 * Sources ship as a header rather than a stream preamble because retrieval
 * fully completes before generation starts, so they are known before the first
 * byte of the body. That keeps the body a single pure text stream.
 */

import type { GenerateContentResponse } from '@google/genai'

import {
  CHAT_ATTEMPT_TIMEOUT_MS,
  CHAT_MODELS,
  getGeminiClient,
} from '@/lib/gemini'
import { retrieve, type RetrievedChunk } from '@/lib/retrieve'

// The `pg` driver opens TCP sockets and cannot run on the edge runtime, and
// this route reaches Postgres through `@/lib/retrieve`.
export const runtime = 'nodejs'

const TOP_K = 5

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

/** Compact shape sent back in `X-Rag-Sources`. */
type Source = {
  slug: string
  name: string
  section: string
  score: number
}

const SYSTEM_INSTRUCTION = `You are a travel itinerary assistant for a small, curated collection of destinations.

GROUNDING RULES — these override everything else:
- Every factual claim about a destination (its food, attractions, seasons, costs, character) must come from the CONTEXT block in the user's message. Nothing else.
- You have no other knowledge of these places. If the context does not cover what was asked, say so plainly in one or two sentences and name what you *can* help with from the context. Never fill a gap with a plausible-sounding detail, a price, an opening time, or a place name that is not in the context.
- If the context is empty or clearly irrelevant to the question, say that the collection does not contain a matching destination. Do not answer from general knowledge.
- Refer to destinations by the name given in the context, so the reader can match your answer to the cited sources.
- General travel advice (packing, pacing, how to structure a day) is fine to give from your own judgement — just do not attach invented specifics to a destination.

STYLE:
- Answer the question that was asked; do not produce a full itinerary unless one was requested.
- Concrete and readable. Short paragraphs, or a short list for a day-by-day plan.
- No preamble about being an AI, and do not mention "the context" as a mechanism — just answer as someone who knows these places.
- Format with plain Markdown only: **bold** for labels, short bullet or numbered lists, and \`###\` for a heading at most. No tables, images, or HTML — the client renders a deliberately small subset and anything else is shown as escaped text.`

function plainText(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

/**
 * Upstream capacity failures worth trying a different model for. Gemini
 * returns 503 "This model is currently experiencing high demand" on the
 * newest models often enough that pinning one model makes the app look
 * broken when the only problem is which model was asked.
 *
 * The SDK reports the upstream status in the message text as well as a
 * `status` field, so check both — `status` is not on the `Error` type.
 */
function isCapacityError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status
  if (status === 503 || status === 429) return true
  if (!(error instanceof Error)) return false
  return /\b(503|429)\b|UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED|quota/i.test(
    error.message,
  )
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /timeout|timed out|aborted|deadline/i.test(error.message)
}

/**
 * The SDK's error messages for upstream failures are raw JSON blobs, which the
 * UI would render verbatim to the user. Unwrap the useful sentence; fall back
 * to the raw message rather than hiding it, since `gemini.ts`'s own errors
 * (e.g. the missing-key message) are already written to be actionable.
 */
function describeGenerationError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Generation failed for an unknown reason.'
  }

  if (isCapacityError(error)) {
    return (
      'The model is at capacity right now (upstream 503/429). This is usually ' +
      'temporary — try again in a moment.'
    )
  }

  // Messages arrive as JSON, sometimes double-encoded: {"error":{"message":"{...}"}}
  let message = error.message
  for (let depth = 0; depth < 3; depth++) {
    const trimmed = message.trim()
    if (!trimmed.startsWith('{')) break
    try {
      const parsed: unknown = JSON.parse(trimmed)
      const inner = (parsed as { error?: { message?: unknown } })?.error?.message
      if (typeof inner !== 'string') break
      message = inner
    } catch {
      break
    }
  }

  return message.trim() || 'Generation failed for an unknown reason.'
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false
  const m = value as Record<string, unknown>
  return (
    (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  )
}

/**
 * Renders the retrieved chunks as a labelled CONTEXT block. Each chunk is
 * headed by its destination and section so the model can attribute a fact to a
 * place, and so a reader comparing the answer against `X-Rag-Sources` sees the
 * same labels.
 */
function formatContext(chunks: RetrievedChunk[]): string {
  const blocks = chunks.map((chunk, i) => {
    const facts = [
      `country: ${chunk.country}`,
      `budget tier: ${chunk.budgetTier}`,
      `best months: ${chunk.bestMonths.join(', ')}`,
      `tags: ${chunk.tags.join(', ')}`,
    ].join(' | ')

    return [
      `[${i + 1}] ${chunk.name} — ${chunk.section}`,
      `(${facts})`,
      chunk.content,
    ].join('\n')
  })

  return ['CONTEXT', '=======', blocks.join('\n\n')].join('\n')
}

/**
 * Wraps an async iterable of text in a `ReadableStream`, following the
 * iterator-to-stream pattern in the Next.js route handler docs
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`).
 *
 * A throw mid-stream is turned into `controller.error()`, which aborts the HTTP
 * response instead of leaving the client's `getReader()` loop hanging forever.
 * The client sees a truncated answer, which is the honest outcome — the headers
 * and a 200 are already on the wire by then and cannot be retracted.
 */
function textStream(source: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const iterator = source[Symbol.asyncIterator]()

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next()

        if (done) {
          controller.close()
          return
        }

        // Skip empty deltas rather than enqueueing zero bytes; the stream
        // simply pulls again.
        if (value) controller.enqueue(encoder.encode(value))
      } catch (error) {
        controller.error(
          error instanceof Error ? error : new Error(String(error)),
        )
      }
    },
    async cancel() {
      // The client disconnected. Let the SDK close the upstream HTTP response
      // instead of leaving it to be garbage collected mid-flight.
      await iterator.return?.()
    },
  })
}

async function* fromGemini(
  response: AsyncGenerator<GenerateContentResponse>,
): AsyncGenerator<string> {
  let emitted = false

  for await (const chunk of response) {
    // `.text` concatenates the text parts of the first candidate and returns
    // undefined when a chunk carries none (e.g. a safety-only or usage-only
    // chunk), so it needs the guard.
    const text = chunk.text
    if (text) {
      emitted = true
      yield text
    }
  }

  if (!emitted) {
    yield 'The model returned an empty response. Please try rephrasing the question.'
  }
}

/** A one-shot stream for the answers that need no model call. */
function staticStream(text: string): ReadableStream<Uint8Array> {
  return textStream(
    (async function* () {
      yield text
    })(),
  )
}

function sourcesHeader(sources: Source[]): string {
  return encodeURIComponent(JSON.stringify(sources))
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return plainText(
      'Request body must be JSON of the form { "messages": [{ "role": "user", "content": "..." }] }.',
      400,
    )
  }

  const messages = (body as { messages?: unknown } | null)?.messages

  if (!Array.isArray(messages) || messages.length === 0) {
    return plainText(
      '`messages` must be a non-empty array of { role: "user" | "assistant", content: string }.',
      400,
    )
  }

  if (!messages.every(isChatMessage)) {
    return plainText(
      'Every message must be { role: "user" | "assistant", content: string }.',
      400,
    )
  }

  const history: ChatMessage[] = messages
  const lastUserIndex = history.findLastIndex((m) => m.role === 'user')

  if (lastUserIndex === -1) {
    return plainText('`messages` must contain at least one user message.', 400)
  }

  const question = history[lastUserIndex].content

  if (question.trim().length === 0) {
    return plainText('The last user message is empty.', 400)
  }

  // ---- Retrieve -----------------------------------------------------------
  // Runs to completion before anything is written, so a failure here is still
  // a clean non-200 and `X-Rag-Sources` is known before the stream opens.
  let chunks: RetrievedChunk[]

  try {
    chunks = await retrieve(question, { k: TOP_K })
  } catch (error) {
    return plainText(
      error instanceof Error
        ? error.message
        : 'Retrieval failed for an unknown reason.',
      500,
    )
  }

  const sources: Source[] = chunks.map((chunk) => ({
    slug: chunk.slug,
    name: chunk.name,
    section: chunk.section,
    score: chunk.score,
  }))

  // The corpus is empty until the dev-only ingest route has run, and even
  // afterwards a query can miss everything. Answering from the model's own
  // knowledge here would be exactly the hallucination this route exists to
  // prevent, so say so directly and skip the model call entirely.
  if (chunks.length === 0) {
    return new Response(
      staticStream(
        "I don't have a destination in this collection that matches your question, " +
          'so there is nothing for me to base an answer on. Try asking about a ' +
          'different place, or a different aspect of one — food, attractions, or ' +
          'when to go.',
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Rag-Sources': sourcesHeader(sources),
        },
      },
    )
  }

  // ---- Generate -----------------------------------------------------------
  // Everything before this turn is passed as conversation history so that
  // follow-ups ("what about the food there?") resolve. Only the current turn
  // carries the CONTEXT block — re-sending stale context for every past turn
  // would let the model ground a new answer in chunks retrieved for an old
  // question. Gemini's assistant role is `model`, not `assistant`.
  const contents = [
    ...history.slice(0, lastUserIndex).map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    {
      role: 'user',
      parts: [
        {
          text: [
            formatContext(chunks),
            '',
            'QUESTION',
            '========',
            question,
          ].join('\n'),
        },
      ],
    },
  ]

  let response: AsyncGenerator<GenerateContentResponse>

  try {
    const ai = getGeminiClient()

    // Awaiting here is deliberate: the SDK resolves this promise only once the
    // upstream HTTP response headers have arrived, so a missing/invalid key or
    // an unknown model id rejects *now* and can still be reported as a 500.
    // Deferring it into the generator would have produced a 200 whose body
    // dies after zero bytes.
    //
    // Because that await covers the upstream handshake, it is also the only
    // place a model can be swapped safely — nothing has been streamed to the
    // client yet, so falling back costs the user latency but never a
    // half-written answer.
    const failures: string[] = []
    let handle: AsyncGenerator<GenerateContentResponse> | null = null

    for (const model of CHAT_MODELS) {
      try {
        handle = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            // Grounded answers should stick close to the source text.
            temperature: 0.3,
            // Propagate a client disconnect so an abandoned request stops billing.
            abortSignal: request.signal,
            // Cap each attempt. The SDK retries internally, and on an
            // overloaded model that can burn ~55s before surfacing a 503 —
            // long enough to look like a hang. Fail fast, try the next model.
            httpOptions: { timeout: CHAT_ATTEMPT_TIMEOUT_MS },
          },
        })
        break
      } catch (error) {
        // A client disconnect is not a model problem — stop immediately.
        if (request.signal.aborted) throw error
        if (!isCapacityError(error) && !isTimeoutError(error)) throw error
        failures.push(model)
      }
    }

    if (!handle) {
      return plainText(
        `Every chat model is unavailable right now (tried ${failures.join(', ')}). ` +
          'Gemini returns 503 when a model is at capacity; this is usually ' +
          'temporary, so try again shortly. If it persists, reorder or extend ' +
          'CHAT_MODELS in src/lib/gemini.ts.',
        503,
      )
    }

    response = handle
  } catch (error) {
    return plainText(describeGenerationError(error), 500)
  }

  return new Response(textStream(fromGemini(response)), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Rag-Sources': sourcesHeader(sources),
      // Streamed text must not be buffered by an intermediate proxy.
      'Cache-Control': 'no-store, no-transform',
    },
  })
}
