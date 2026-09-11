# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev     # dev server on :3000
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint (bare `eslint`, driven by eslint.config.mjs — not `next lint`)
npm run typecheck  # tsc --noEmit

npm run db:up      # start Postgres+pgvector (host port 5433)
npm run db:reset   # destroy the volume and restart empty
npm run db:generate / db:migrate   # drizzle-kit
npm run db:psql    # psql into the container
npm run db:ingest  # POST /api/ingest — embeds the corpus and replaces both tables
```

No test runner is configured — no Jest/Vitest/Playwright dependency, config, or script exists. If tests are needed, pick and install a framework first rather than assuming one is present.

## State of the codebase

A working RAG chatbot over a curated travel-destination corpus. **`spec/initialsetup.md` is the authoritative design document** — it records all 12 infrastructure decisions, what was rejected and why, and a "stale priors corrected" table of things that are easy to get wrong here. Read it before changing architecture.

Pipeline: `src/data/destinations.ts` (typed corpus, one object per destination with named prose sections) → `POST /api/ingest` (dev-only, embeds every section, replaces both tables in a transaction) → `src/lib/retrieve.ts` (cosine similarity + optional metadata filters) → `POST /api/chat` (grounded, streamed) → `src/app/_components/Chat.tsx`.

### Non-obvious constraints — these bite

- **Embeddings are pinned to 1536 dims**, not `gemini-embedding-2`'s 3072 default, because pgvector cannot HNSW-index a `vector` above 2000 dimensions. Changing it means a migration *and* re-embedding everything.
- **Batch embedding needs each input wrapped as its own `Content`**: `texts.map(text => ({ parts: [{ text }] }))`. A bare `string[]` type-checks fine but collapses into one `Content` and returns **one** embedding.
- **`ORDER BY embedding <=> $1` ascending — never `desc(1 - cosineDistance(...))`.** The wrapped form returns identical rows but silently abandons the HNSW index (`Seq Scan` + `Sort`).
- **pgvector post-filters**: HNSW takes `hnsw.ef_search` (default 40) candidates *then* applies `WHERE`, so filtered queries can under-return. Mitigated with `SET LOCAL hnsw.iterative_scan` inside a transaction — `SET LOCAL` outside a transaction is a silent no-op.
- **The `pg` Pool is cached on `globalThis`** (`src/db/index.ts`), as is the Gemini client. Without it, `next dev` HMR leaks a pool per save until Postgres refuses connections.
- **`/api/ingest` is guarded by `NODE_ENV`.** It deletes both tables. Keep the guard.
- Chat history is **not** persisted (React state only) — a refresh clears it, by design.
- **Free tier only.** Every model used here (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-embedding-2`) has a free tier. `gemini-3.1-pro-preview` does **not** — that is why it returned 429 in testing; do not add it. Exceeding a free-tier limit returns `429 RESOURCE_EXHAUSTED`, it never silently bills; charges are only possible if a billing account is linked to the Google Cloud project. Re-check pricing before adding any model.
- **Chat models are a fallback chain, not a single id** (`CHAT_MODELS` in `src/lib/gemini.ts`). Gemini 503s the newest models under load, and `gemini-3.8-flash` took **55s to surface that 503** because the SDK retries internally. Each attempt is capped by `CHAT_ATTEMPT_TIMEOUT_MS` (`config.httpOptions.timeout`) so an overloaded model is abandoned in seconds. Measured 2026-09-11: 3.8-flash and 3.7-flash 503ing; `gemini-3.5-flash-lite` ~0.7s; `gemini-3.5-flash` ~7.8s; `gemini-3.1-pro-preview` 429 on this key's tier. Reorder the array to trade speed for capability.
- **`next dev` will not be on :3000.** Docker containers from another project (`thrive-app-nxgen-api-1`) hold 3000, and Postgres uses 5433 for the same reason. Next prints the port it actually picked — read that line; it is usually 3001. Next 16 also defers to an already-running dev server for this directory instead of starting a second one.

## Architecture and conventions

- **Next.js 16.3.4 + React 19.2.8, App Router**, sources under `src/app` (so route files live at `src/app/**`, not a top-level `app/`). Per `AGENTS.md`, consult `node_modules/next/dist/docs/` for this version's APIs before writing framework code — several conventions differ from earlier Next.js releases.
- **Generated route types.** `layout.tsx` types its props as `LayoutProps<"/">` — a global type emitted into `.next/types` by `next dev`/`next build` and picked up via the `.next/types/**` and `.next/dev/types/**` entries in `tsconfig.json`. Use these generated helpers (`LayoutProps<route>`, `PageProps<route>`) instead of hand-writing `{ children, params }` prop types, and note that typechecking a clean tree may require a build first to generate them.
- **Tailwind CSS v4, CSS-first.** There is no `tailwind.config.*`. Configuration lives in `src/app/globals.css` via `@import "tailwindcss"` and the `@theme inline` block, which maps CSS custom properties (`--background`, `--foreground`, the Geist font variables) to Tailwind tokens (`--color-background`, `--font-sans`, …). Add design tokens there, not in a JS config. PostCSS wiring is just `@tailwindcss/postcss`.
- **Theming** is `prefers-color-scheme`-based: `:root` holds light values and a dark media query overrides them, so new colors should be added as variables in both blocks rather than hardcoded in components.
- **Fonts** are loaded with `next/font/google` in the root layout and exposed as CSS variables on `<html>`; reference them through the Tailwind `--font-*` tokens.
- **Import alias** `@/*` → `./src/*`.
- TypeScript is `strict`, `module: esnext`, `moduleResolution: bundler`.

## Notes

- `.gitignore` ignores all `.env*` files. `.env.local` holds `DATABASE_URL` and `GEMINI_API_KEY`.
- Host port **5433**, not 5432 — another project occupies 5432 on this machine.
- `AGENTS.md`'s Next.js rules block is regenerated by `next dev`; if it reappears as an uncommitted change, commit it alongside your work instead of reverting it.
