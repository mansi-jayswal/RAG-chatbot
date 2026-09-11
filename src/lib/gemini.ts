import { GoogleGenAI } from '@google/genai'

/**
 * Model IDs and the embedding dimension live here so they exist in exactly one
 * place. The dimension is also baked into the Drizzle schema (`vector(1536)`)
 * and into every row already in the database — see the note in `embed.ts`
 * before changing it.
 */
/**
 * Chat models in preference order — the route tries each in turn and uses the
 * first that responds (see `CHAT_ATTEMPT_TIMEOUT_MS` below).
 *
 * Why a list and not a single id: measured on 2026-09-11, `gemini-3.8-flash`
 * and `gemini-3.7-flash` were both returning 503 "This model is currently
 * experiencing high demand", and 3.8 took **55 seconds** to surface that
 * failure because the SDK retries internally. A single hard-coded model turns
 * a transient upstream capacity problem into a dead app.
 *
 * Measured first-token latency on that date:
 *   gemini-3.8-flash        503 after 55s
 *   gemini-3.7-flash        503 after 21s
 *   gemini-3.5-flash        ok,  ~7.8s
 *   gemini-3.5-flash-lite   ok,  ~0.7s
 *   gemini-3.1-flash-lite   ok,  ~1.5s
 *   gemini-3.1-pro-preview  429 (not available on this key's tier)
 *
 * Ordering favours responsiveness, because generation here is grounded
 * summarization of retrieved chunks rather than open-ended reasoning — the
 * retrieved context does the heavy lifting. Reorder this array to prefer
 * capability over speed; no other file needs to change.
 */
/**
 * FREE TIER ONLY — every model in this list must have a free tier.
 *
 * Checked against ai.google.dev/gemini-api/docs/pricing on 2026-09-11:
 *   gemini-3.5-flash-lite   free tier: yes
 *   gemini-3.5-flash        free tier: yes
 *   gemini-3.1-flash-lite   free tier: yes
 *   gemini-3.8-flash        free tier: yes (currently 503ing under load)
 *   gemini-3.1-pro-preview  free tier: NO  <- do not add; this is why it
 *                                            returned 429 in testing
 *
 * Exceeding a free-tier limit returns 429 RESOURCE_EXHAUSTED — it does not
 * silently bill. Charges are only possible if a billing account is linked to
 * the Google Cloud project (which moves it to Tier 1). Keep billing unlinked
 * and this app cannot cost money. Re-check pricing before adding a model.
 */
export const CHAT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
] as const

/** Kept for convenience/back-compat; the route uses `CHAT_MODELS`. */
export const CHAT_MODEL = CHAT_MODELS[0]

/**
 * Per-attempt upstream timeout. Without it the SDK's internal retries can sit
 * on a single overloaded model for ~55s, which reads as a hung request in the
 * UI and blows past any sane client timeout. Failing fast lets the next model
 * in `CHAT_MODELS` be tried while the user is still waiting.
 */
export const CHAT_ATTEMPT_TIMEOUT_MS = 12_000

export const EMBEDDING_MODEL = 'gemini-embedding-2'
export const EMBEDDING_DIMENSIONS = 1536

/**
 * The client is created lazily and memoized on `globalThis`, for the same
 * reason the pg Pool is (see `src/db/index.ts`): `next dev` re-evaluates
 * modules on every save, and a module-scope instance would be rebuilt each
 * time. Lazy construction also means a missing key surfaces as the error
 * below on first use, rather than as an import-time crash during `next build`.
 */
const globalForGemini = globalThis as unknown as { __geminiClient?: GoogleGenAI }

export function getGeminiClient(): GoogleGenAI {
  if (globalForGemini.__geminiClient) return globalForGemini.__geminiClient

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to .env.local at the project root:\n' +
        '  GEMINI_API_KEY=your-key-here\n' +
        'Create a key at https://aistudio.google.com/apikey , then restart the dev server ' +
        '(Next.js only reads .env.local at startup). ' +
        'Without it every Gemini call fails with an opaque 400.',
    )
  }

  const client = new GoogleGenAI({ apiKey })
  globalForGemini.__geminiClient = client
  return client
}
