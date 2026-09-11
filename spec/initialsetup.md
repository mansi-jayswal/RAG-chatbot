# Initial Setup Spec — Travel Itinerary RAG Chatbot

Infrastructure design for a RAG chatbot that generates travel destination itineraries.
Settled across two design sessions (2026-09-09, 2026-09-10) and **implemented on
2026-09-10**. Sections marked "verified" or "CORRECTION" were checked against the running
system, not just reasoned about.

Scope of this phase: Next.js app, package selection, Postgres + pgvector setup, and folder
structure. Retrieval tuning, prompt design, and UI polish are explicitly out of scope.

---

## Decision summary

| # | Decision | Choice |
|---|----------|--------|
| 1 | Postgres host | Docker Compose, `pgvector/pgvector:pg17` |
| 2 | DB layer | Drizzle ORM + drizzle-kit |
| 3 | Embeddings | Gemini `gemini-embedding-2` @ 1536 dims → `vector(1536)` + HNSW cosine |
| 4 | Generation | `@google/genai` directly, hand-rolled stream, `CHAT_MODELS` fallback chain |
| 5 | Corpus | Typed TS array with metadata + named prose sections |
| 6 | Granularity | `destinations` + `chunks`, one chunk per section |
| 7 | Metadata placement | Normalized on `destinations`, JOIN at query time |
| 8 | Migrations | `drizzle-kit generate` + `migrate`, extension in `0000` |
| 9 | Driver | `pg` (node-postgres) + `Pool` on `globalThis` |
| 10 | Chat history | Not persisted — React state only |
| 11 | Ingest | Dev-only `POST /api/ingest`, `NODE_ENV` guarded |
| 12 | Structure | `src/{app,db,lib,data}` + root `drizzle/` |

---

## 1. Postgres host — Docker Compose, `pgvector/pgvector:pg17`

pgvector is **not part of Postgres**. It is a C extension that must be compiled into the
server binary and then enabled per-database with `CREATE EXTENSION vector`. The official
`pgvector/pgvector` image is plain Postgres with the extension pre-compiled in; the stock
`postgres:17` image cannot load it.

Chosen over Neon/Supabase for offline iteration and instant `docker compose down -v` resets
while learning. The connection string stays a plain `DATABASE_URL`, so moving to a hosted
Postgres later is a config change, not a rewrite.

```yaml
# docker-compose.yml
services:
  db:
    image: pgvector/pgvector:pg17
    ports: ["5433:5432"]   # 5432 taken by another project
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: rag
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

```
# .env.local  (gitignored)
DATABASE_URL=postgres://postgres:postgres@localhost:5433/rag
GEMINI_API_KEY=...
```

**Rejected:** Supabase (its SDK hides the SQL we want to read), native Homebrew install
(build friction, no upside), Neon (network round-trip per experiment; revisit at deploy).

---

## 2. DB layer — Drizzle ORM + drizzle-kit

Drizzle has first-class pgvector support: a real `vector(name, { dimensions: N })` column
type, HNSW/IVFFlat index support with operator classes, and `cosineDistance()` /
`l2Distance()` helpers that compile to the `<=>` / `<->` operators. `drizzle-kit generate`
emits plain `.sql` migration files that get read and committed, so the actual SQL stays
visible.

**API corrections found during implementation** (verified against drizzle-orm 0.45.2's own
type definitions — an earlier draft of this spec described these wrongly):

- There is **no `hnsw()` helper**. Use the generic index builder:
  `index('name').using('hnsw', t.embedding.op('vector_cosine_ops'))`. `'hnsw'` is a member of
  the `PgIndexMethod` union and `'vector_cosine_ops'` of `PgIndexOpClass`, so it typechecks
  with no cast. `.op()` comes from `ExtraConfigColumn` in
  `drizzle-orm/pg-core/columns/common.d.ts`.
- `vector()` takes a **config object**, not a bare number: `vector('embedding', { dimensions: 1536 })`.
- The third `pgTable` argument must **return an array**. The object form is still accepted but
  is marked `@deprecated` in 0.45.2.

**Rejected — Prisma:** no native vector type. The column must be declared
`Unsupported("vector(1536)")`, which Prisma Client cannot read or write, so every embedding
insert and every similarity search becomes an untyped `$queryRaw`. That is an ORM opting out
of the one feature this project is built around.

**Rejected:** raw `pg` + hand-written SQL (no type safety, own migration runner), Kysely
(hand-maintained types, thinner RAG ecosystem).

---

## 3. Embeddings — Gemini `gemini-embedding-2` at 1536 dimensions

**Verified facts** (from Google's docs, 2026-09-09):

- Default output is **3072 dims**; flexible 128–3072, recommended 768 / 1536 / 3072.
- **No `taskType` parameter** — that belonged to the older model. Task intent now goes in
  the prompt text. Most tutorials still show `taskType: RETRIEVAL_DOCUMENT`; that is stale.
- Auto-renormalizes non-default dimensions (the older model required manual normalization).
- Max input: 8192 tokens across all modalities.
- SDK package: `@google/genai`.

**Why 1536 and not the 3072 default:** pgvector caps the `vector` type at **2000 dimensions**
for HNSW indexes, because an index tuple must fit inside Postgres's 8KB page. A
`vector(3072)` column cannot be HNSW-indexed:

```
ERROR: column cannot have more than 2000 dimensions for hnsw index
```

1536 sits safely under the cap, needs no exotic column type, and happens to match
OpenAI's `text-embedding-3-small` size — so most RAG examples online match this schema.

**Rejected:** 768 dims (cheaper and faster, but blurrier on exactly the nuanced distinctions
travel queries lean on); `halfvec(3072)` (fp16 lifts the HNSW ceiling to 4000 and halves
storage, but `halfvec_cosine_ops` is a little-travelled path with almost no reference
material); `vector(3072)` with no index (legal — the cap applies to indexes, not storage —
but every search becomes a sequential scan).

**The dimension is baked into the schema.** Changing it later means a migration *and*
re-embedding every chunk.

---

## 4. Generation — `@google/genai` directly

One SDK for both chat and embeddings. One dependency, one API key, and the code maps 1:1
onto Google's docs, so there is no middle layer to suspect when something breaks. It also
gives direct control over embedding params with no provider-options indirection.

The cost is accepted deliberately: the streaming plumbing is hand-written — a
`ReadableStream` in the route handler, and a `response.body.getReader()` loop plus message
and loading state on the client.

Chat model: a **fallback chain**, `CHAT_MODELS` in `src/lib/gemini.ts` — not a single id.

**Why (measured 2026-09-11, after the build):** pinning `gemini-3.8-flash` made the app
look broken. It was returning 503 "This model is currently experiencing high demand", and
took **55 seconds** to surface that failure because the SDK retries internally. End-to-end
that produced a 19.6s response at best and a client timeout at worst.

| model | observed |
|---|---|
| `gemini-3.8-flash` | 503 after **55s** |
| `gemini-3.7-flash` | 503 after 21s |
| `gemini-3.5-flash` | ok, ~7.8s to first token |
| `gemini-3.5-flash-lite` | ok, **~0.7s** |
| `gemini-3.1-flash-lite` | ok, ~1.5s |
| `gemini-3.1-pro-preview` | 429 — not on this key's tier |

The route walks `CHAT_MODELS` in order and uses the first that responds, capping each
attempt with `config.httpOptions.timeout` (`CHAT_ATTEMPT_TIMEOUT_MS`, 12s). Falling back is
safe only at that point — the `await` on `generateContentStream` covers the upstream
handshake, so nothing has been streamed yet and the client can never see a half-written
answer. Ordering favours latency because generation here is grounded summarization of
retrieved chunks; reorder to prefer capability.

Result: 19.6s -> **1.9s** to first byte, with genuine incremental streaming (18 chunks over
2.95s on a long answer).

Note `gemini-2.0-flash` has been **shut down** by Google, though the Vercel AI SDK's own
tutorial still cites it.

**Rejected — Vercel AI SDK 7:** `streamText` + `useChat` would supply token streaming,
message state, loading/error states and abort for free. Genuinely less code. Rejected
because writing the streaming layer is a learning goal for this project.

**Rejected — LangChain.js:** its `PGVectorStore` creates and queries its own table, which
would make the Drizzle schema redundant and hide the `<=>` query behind
`similaritySearch()` — the opposite of the goal in decision #2.

---

## 5. Corpus — a typed TS array

`src/data/destinations.ts` exports a typed array of destination objects. Compile-time
checked, no parser, no `fs` globbing, and the object shape *is* the row shape — so ingest is
just map → embed → insert.

```ts
{ slug: 'kyoto', name: 'Kyoto', country: 'Japan',
  bestMonths: [3, 4, 10, 11], budgetTier: 'mid',
  tags: ['temples', 'walkable', 'food'],
  sections: {
    overview: 'Kyoto rewards slow travel...',
    food: 'Kaiseki is the formal multi-course...',
    attractions: 'Fushimi Inari...',
  } }
```

**Rejected:** markdown files with frontmatter (needs a parser, no real gain here);
Wikivoyage dump (writing a wikitext parser would *be* the project, and its metadata is
unstructured); user-uploaded PDFs (pulls file storage, async jobs and auth into scope);
a Kaggle/HF CSV (rows of short structured fields are what SQL is already good at — with
little prose to embed, vector search adds almost nothing).

---

## 6 & 7. Schema — two tables, normalized metadata

**Granularity: one chunk per prose section.** An embedding is an *average* of everything in
its text. Embedding 800 words spanning temples, ramen, nightlife and transit into one vector
means a query about "great ramen" matches it only weakly — the signal is diluted. That
dilution is the entire reason chunking exists.

Section boundaries are **semantic**, hand-authored, and aligned with how people ask
questions — so no splitter library, no `chunkSize`/`chunkOverlap` to tune blindly, and the
`section` label comes free (useful for filtering and for showing *why* a result matched).

**Metadata: normalized.** Filterable fields live only on `destinations`; `chunks` holds
content, embedding and the FK. Filtered searches JOIN.

```ts
// src/db/schema.ts (shape, not final code)
destinations: slug (PK), name, country, bestMonths integer[],
              budgetTier, tags text[]
chunks:       id (PK), destinationSlug (FK → destinations.slug),
              section, content, embedding vector(1536)
              index: hnsw (embedding vector_cosine_ops)
              index: btree (destinationSlug)
```

### The pgvector post-filtering trap

pgvector applies `WHERE` **after** the index scan. HNSW fetches `hnsw.ef_search` candidates
(default **40**), *then* filters. So on a corpus that is 10% Japan, a `LIMIT 10` query with
`WHERE country = 'Japan'` returns roughly 4 rows — silently, with no error.

Mitigations for this schema:

- `SET hnsw.iterative_scan = 'relaxed_order'` (pgvector 0.8.0+) — keeps scanning until it
  has enough results. `strict_order` preserves exact distance ordering; `relaxed_order`
  gives better recall.

  **Verified gotcha:** use `SET LOCAL` **inside a transaction**. Two reasons. First, the pg
  `Pool` hands out shared connections, so a session-wide `SET` leaks the setting into
  unrelated later queries on that same connection. Second — confirmed by running it —
  `SET LOCAL` outside a transaction block does *nothing* and only emits
  `WARNING: SET LOCAL can only be used in transaction blocks`. A warning, not an error: the
  query still succeeds, still post-filters, and still silently under-returns. The mitigation
  fails open and says nothing.
- Raise `hnsw.ef_search` above its default of 40.
- btree index on `chunks.destination_slug` for the join.

### ORDER BY must use the raw distance, not the similarity

Order by `embedding <=> $1` **ascending**. Do NOT order by `(1 - (embedding <=> $1))`
descending, even though it is mathematically identical and reads more naturally.

Postgres performs no algebra on a sort key, so the wrapped expression is not recognized as
an ordered-index operation and the HNSW index is silently abandoned. Measured with `EXPLAIN`
on 1200 chunks:

```
ORDER BY embedding <=> const              -> Limit -> Index Scan using chunks_embedding_idx
ORDER BY (1 - (embedding <=> const)) DESC -> Limit -> Sort -> Seq Scan on chunks
```

Both return the same rows, so this never surfaces as a bug — only as an index that quietly
stopped being used. Still SELECT `1 - distance` as the human-facing `score`; only the
ORDER BY has to stay raw. `score` is therefore **cosine similarity, higher is better**.

**Known limitation, accepted:** partial HNSW indexes are unavailable in a normalized model —
an index on `chunks` cannot reference `destinations.country`. `EXPLAIN` becomes required
reading. The alternative (denormalizing country/bestMonths/tags onto every chunk row) was
considered and rejected in favour of a single source of truth.

---

## 8. Migrations — `generate` + `migrate`, extension in the first migration

**The pgvector gotcha:** drizzle-kit reads the TypeScript schema, and nothing in it says
`CREATE EXTENSION vector`. The generated migration jumps straight to
`CREATE TABLE ... embedding vector(1536)` and fails:

```
ERROR: type "vector" does not exist
```

Fix: hand-add the extension to the top of the first generated migration.

```sql
-- drizzle/0000_init.sql
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "destinations" (...);
--> statement-breakpoint
CREATE TABLE "chunks" ("embedding" vector(1536), ...);
CREATE INDEX "chunks_emb_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);
```

This makes the `drizzle/` folder a **complete description of the database**: any empty
Postgres anywhere goes from nothing to correct with one command, with no manual step and no
README instruction anyone can skip.

**Rejected:** `drizzle-kit push` (never shows the SQL, no version history, still needs a
manual `CREATE EXTENSION`); a Docker `initdb.d` init script (runs only on *first* volume
creation, so `down` without `-v` never re-runs it, and hosted Postgres has no `initdb.d`);
fully hand-written migrations (TS schema and SQL drift apart silently).

---

## 9. Driver — `pg` + `Pool` on `globalThis`

**The Next.js trap:** `next dev` hot-reloads modules on every save. A pool created at module
scope is recreated on each reload while the old one stays alive holding its sockets. After
~20 saves, Postgres hits `max_connections` (default 100):

```
sorry, too many clients already
```

It presents as a database problem; it is a module-lifecycle problem. Caching the pool on
`globalThis` — which survives HMR — is the fix, and it is not optional.

```ts
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const g = globalThis as unknown as { pool?: Pool }
const pool = g.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
if (process.env.NODE_ENV !== 'production') g.pool = pool

export const db = drizzle({ client: pool, schema })
```

`pg` chosen over `postgres.js` for ubiquity (every error message and deployment guide
assumes it) and inspectable pool semantics — `pool.totalCount` makes the leak above
observable rather than theoretical. Note `postgres.js` also uses prepared statements by
default, which needs `prepare: false` behind a transaction-pooling proxy like PgBouncer.

**Rejected:** a single `pg.Client` (requests serialize behind one socket; a dropped
connection stays dead); connect-per-request (TCP + auth cost on every request, and one
missed `finally` rebuilds the leak by hand).

---

## 10. Chat history — not persisted

Conversation lives in React `useState`; the full message array is posted each turn.
Migration 0000 therefore contains only `destinations` and `chunks`.

**Accepted cost, stated plainly:** no retrieval trace is recorded. When the bot gives a bad
itinerary, the useful question is not "what did it say" but "what did it retrieve" — without
a record of which chunks were fed to the model, a bad answer cannot be diagnosed as a
*retrieval* failure (right model, wrong context) versus a *generation* failure (right
context, sloppy answer). Those have opposite fixes: re-chunking/re-embedding versus prompt
work. Diagnosing will mean re-running queries by hand.

Adding this later is a cheap migration: `conversations` + `messages`, with a
`retrieval jsonb` column on assistant messages holding `{ chunkId, slug, section, score }[]`.
If added, the write must happen **after** the stream closes, since the text is accumulated
as it streams.

---

## 11. Ingest — dev-only `POST /api/ingest`

Runs inside Next, so `@/` path aliases resolve normally and ingest shares the exact same
`db` client and `schema` modules as the chat route. No new dependency.

```ts
// src/app/api/ingest/route.ts
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not available', { status: 403 })
  }
  // read corpus → embed sections → insert destinations + chunks
}
```

```bash
curl -X POST localhost:3000/api/ingest
```

**Two risks to respect:**

1. **The guard is load-bearing.** Without it this is a public endpoint that rewrites the
   database.
2. **Route timeout bounds corpus size.** Embedding is sequential network calls. A few dozen
   destinations is fine; a few hundred sections will press against the limit (fatal on
   serverless). Batch the `embedContent` calls and return progress in the response.

**Rejected — native `node src/db/seed.ts`:** verified on this machine that Node 24.12 runs
`.ts` with no flags, but it **ignores tsconfig `paths`** (`import { db } from '@/db'` →
`ERR_MODULE_NOT_FOUND`) and requires explicit `.ts` extensions on relative imports. That
cascades: `src/db/index.ts` importing `'./schema'` would need `'./schema.ts'`, making shared
modules non-idiomatic for the Next side. It would also need `"type": "module"` in
`package.json`, affecting the whole project.

**Rejected:** `tsx` devDependency (clean, resolves aliases — but adds a dependency Node 24
almost makes unnecessary); a Server Action from an admin page (most machinery, fewest runs).

---

## 12. Folder structure — project files outside `app`

Next's own docs (`node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`)
describe three strategies and explicitly decline to rank them: "choose a strategy that works
for you and be consistent." It also notes `lib` and `components` carry no framework
significance.

This project uses the first strategy — `src/app` holds *only* routing; everything else sits
in sibling folders, each mapping to one decision above.

```
docker-compose.yml
drizzle.config.ts
drizzle/
  0000_init.sql          # generated, + CREATE EXTENSION added by hand
spec/
  initialsetup.md        # this file
src/
  app/
    page.tsx             # chat UI (client component)
    api/chat/route.ts    # retrieve → generate → ReadableStream
    api/ingest/route.ts  # dev-only, NODE_ENV guarded
  db/
    index.ts             # pg Pool on globalThis + drizzle client
    schema.ts            # destinations, chunks, hnsw + btree indexes
  lib/
    gemini.ts            # @google/genai client
    embed.ts             # gemini-embedding-2 @ 1536 dims
    retrieve.ts          # join + cosineDistance + top-k
  data/
    destinations.ts      # typed corpus
```

**Rejected:** private `_folders` inside `app` (noisier imports; odd for `drizzle.config.ts`
to point into the app router); `src/features/{rag,chat}` (deeper tree than the ~6 modules it
would organize; `db/schema.ts` belongs to both features anyway); `src/server/` +
the `server-only` package (safest — it turns a client-component import of a key-holding
module into a *build* failure rather than a runtime hazard — but an extra dependency and
directory level for a small risk with one developer and one client component).

---

## Dependencies to install

```bash
npm i drizzle-orm pg @google/genai
npm i -D drizzle-kit @types/pg
```

Nothing beyond the existing scaffold's `next` / `react` / `tailwind` / `eslint` /
`typescript`. Notably absent by choice: `ai`, `@ai-sdk/*`, `langchain`, `tsx`.

---

## Build order

1. `docker-compose.yml`, then `docker compose up -d`; confirm :5433 is reachable.
2. `.env.local` with `DATABASE_URL` (port 5433) and `GEMINI_API_KEY` (`.gitignore` already covers `.env*`).
3. Install dependencies.
4. `src/db/schema.ts` — tables, `vector(1536)`, HNSW + btree indexes.
5. `drizzle.config.ts`, then `npx drizzle-kit generate`.
6. **Hand-edit** `drizzle/0000_*.sql` to add `CREATE EXTENSION IF NOT EXISTS vector;` at the top.
7. `npx drizzle-kit migrate`; verify with `\d chunks` and `\di`.
8. `src/db/index.ts` — pool + globalThis guard.
9. `src/data/destinations.ts` — a handful of destinations is enough to exercise every layer.
10. `src/lib/{gemini,embed}.ts`, then `src/app/api/ingest/route.ts`; run it and verify row counts.
11. `src/lib/retrieve.ts` — join + cosine + top-k; check `EXPLAIN` on a filtered query.
12. `src/app/api/chat/route.ts` + `src/app/page.tsx`.

---

## Open items for implementation

- ~~**`outputDimensionality` config key.**~~ **RESOLVED** against `@google/genai@2.21.0`'s
  own type definitions. The key name and nesting the spec assumed were both correct:
  `embedContent({ model, contents, config: { outputDimensionality: 1536 } })`. Additional
  verified facts: the response documents its ordering as "in the same order as provided in the
  batch request", so position-based matching is safe; and the float array is
  `response.embeddings?.[i].values`, typed `number[] | undefined` — it needs a runtime guard.

  **CORRECTION — batching must wrap each input as its own `Content`.** An earlier draft of
  this spec claimed `contents` accepts a bare `string[]` "so batching needs no
  `{ parts: [...] }` wrapping". That is **wrong**, and it was wrong in a way the compiler
  cannot catch. `ContentListUnion` is `Content | Content[] | PartUnion | PartUnion[]` and
  `string` is a `PartUnion`, so a bare `string[]` type-checks as `PartUnion[]` — read as
  **one** `Content` with many parts, returning **one** embedding. Verified live: 3 bare
  strings returned 1 embedding; `texts.map(text => ({ parts: [{ text }] }))` returned 3.
  Reading the `.d.ts` files was not sufficient here; only a real call settled it.

  **Clarification on `taskType`.** Decision 3 above says `gemini-embedding-2` has no
  `taskType` parameter. That is a *model* fact, not an *SDK* fact — and the distinction
  matters, because `EmbedContentConfig` in this SDK **does** declare `taskType?: string`.
  That config object is shared across every embedding model the SDK supports (including the
  older `text-embedding-004`), the field is an unvalidated loose string, and the SDK will
  forward whatever you set for the backend to reject. So do not read its presence in
  autocomplete as evidence that `gemini-embedding-2` wants it. It is deliberately not set.
- **Where `hnsw.iterative_scan` gets set** — per-session `SET` inside the retrieval query,
  or `ALTER DATABASE`. Decide when retrieval is written.
- **Top-k value** and whether a similarity floor is applied. Deferred to retrieval tuning.
- **`next.config.ts`** may need `serverExternalPackages: ['pg']` if bundling complains.

---

## Verified environment (2026-09-10)

- Node 24.12.0, npm 11.6.2
- Postgres 17.11 + pgvector **0.8.6** running in Docker (0.8.x confirms `hnsw.iterative_scan` is available)
- Docker 29.1.2, Compose v2.40.3, daemon running
- Host port 5432 is occupied by another project (`thrive-app-nxgen-db-1`); this project uses **5433**
- Next.js 16.3.4, React 19.2.8, Tailwind v4, TypeScript strict, `@/*` → `./src/*`

## Stale priors corrected during design

Recorded because they will mislead again if trusted from memory:

| Prior | Reality |
|-------|---------|
| `gemini-embedding-001`, 1536 default | `gemini-embedding-2`, **3072** default |
| Gemini embeddings take `taskType` | Removed on `gemini-embedding-2` — use prompt text |
| `gemini-2.0-flash` is current | **Shut down**; use `gemini-3.8-flash` |
| Vercel AI SDK v4/v5 route shape | On **7.x**, different API surface |
| Node needs `tsx` to run `.ts` | Node 24 runs it natively — but ignores tsconfig `paths` |
| pgvector handles `WHERE` before ranking | It **post-filters**; `ef_search` default is 40 |
| `ORDER BY desc(1 - distance)` is equivalent | Same rows, but **abandons the HNSW index** (Seq Scan + Sort) |
| `contents: string[]` batches embeddings | Collapses to **one** Content -> one embedding; wrap each as `Content` |
| `SET LOCAL` applies wherever you write it | Silent no-op outside a transaction (warning only) |
| A 503 surfaces quickly | The SDK retries internally — `gemini-3.8-flash` took **55s** to fail |
| One pinned chat model is fine | Newest models 503 under load; needs a fallback chain + per-attempt timeout |
