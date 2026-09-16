# Rootwise

A retrieval-augmented travel assistant for **20 destinations across India**. Ask it anything — a three-day itinerary for Udaipur, where to go in December, which temple towns have the best street food — and every answer is written _only_ from a curated set of hand-written destination guides, with the exact passages it used shown underneath.

If the guides don't cover something, Rootwise says so instead of inventing a plausible-sounding detail. That constraint is the whole point of the project.

---

## Demo

> _Demo video and screenshots to be added._

<!--
Drop media into `docs/` and uncomment:

![Rootwise homepage](docs/screenshot-home.png)
![Chat answer with sources](docs/screenshot-chat.png)

For a video, either link a GitHub-hosted upload or embed a GIF:
https://github.com/mansi-jayswal/RAG-chatbot/assets/<id>/<file>.mp4
-->

---

## What it does

- **Grounded answers.** Questions are answered from a corpus of destination write-ups, never from the model's general knowledge.
- **Visible sources.** Every reply lists the passages behind it, with similarity scores, so you can check the answer against its evidence.
- **Streamed responses.** Text appears token by token, and can be stopped mid-answer.
- **Browse without asking.** A grid of recommended destinations, theme filters, and a month-by-month "when to go" strip — all derived from the corpus data, so no figure on the page can go stale.
- **Destination detail dialogs.** Open any destination to read its full guide locally, with a button that hands a question to the chat.
- **No accounts, no storage.** Conversations live in React state only. A refresh clears them, by design.

## How it works

```
                     src/data/destinations.ts
                     20 destinations × 5 prose sections
                                  │
                                  │  POST /api/ingest   (dev only, incremental)
                                  ▼
                     gemini-embedding-2 @ 1536 dims
                                  │
                                  ▼
                     Postgres 17 + pgvector
                     destinations ── chunks (HNSW, cosine)
                                  ▲
        your question ────────────┘  cosine similarity, top 5
                                  │  optional metadata filters
                                  ▼
                     retrieved passages only
                                  │
                                  ▼
                     Gemini chat model  ──stream──▶  UI
                                  │
                                  └──▶ X-Rag-Sources header ──▶ "Where this came from"
```

1. **Ingest.** Each destination's five prose sections (`overview`, `food`, `attractions`, `gettingAround`, `whenToGo`) become one independently embedded chunk. Sections are written to be self-contained, because a section is retrieved without its siblings.
2. **Retrieve.** The question is embedded and compared against all 100 chunks by cosine distance, returning the top 5. Optional filters narrow by month or budget tier.
3. **Generate.** Only the retrieved passages are handed to the model, alongside grounding rules that forbid filling gaps from outside knowledge.
4. **Cite.** The retrieval trace is returned in an `X-Rag-Sources` response header before the stream opens, so the UI can show sources even if generation later fails.

## Tech stack

| Layer            | Choice                                                             | Notes                                             |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| Framework        | **Next.js 16.3** (App Router) + **React 19.2**                     | Sources under `src/app`; Turbopack                |
| Language         | **TypeScript 5**                                                   | `strict`, `moduleResolution: bundler`             |
| Database         | **Postgres 17** + **pgvector**                                     | `pgvector/pgvector:pg17` via Docker Compose       |
| ORM / migrations | **Drizzle ORM** + drizzle-kit                                      | Schema in `src/db/schema.ts`                      |
| Vector index     | **HNSW**, `vector_cosine_ops`                                      | 1536 dimensions                                   |
| Embeddings       | **gemini-embedding-2**                                             | Pinned to 1536 dims                               |
| Chat             | **Gemini** — `3.5-flash-lite` → `3.5-flash` → `3.1-flash-lite`     | Fallback chain, not a single model                |
| Styling          | **Tailwind CSS v4** (CSS-first) + **shadcn/ui**                    | No `tailwind.config.*`; tokens in `globals.css`   |
| Components       | Radix primitives via shadcn — dialog, tabs, button, badge          |                                                   |
| Icons            | **lucide-react**                                                   |                                                   |
| Motion           | **GSAP** + ScrollTrigger                                           | All effects gated behind `prefers-reduced-motion` |
| Markdown         | **react-markdown** + remark-gfm                                    | Strict tag allow-list; raw HTML not enabled       |
| Fonts            | **Fraunces** (display), **Instrument Sans** (body), **Geist Mono** | Self-hosted via `next/font`                       |

## Getting started

### Prerequisites

- **Node.js 20.6+** (developed on 24) — `drizzle.config.ts` uses `process.loadEnvFile`
- **Docker** — for Postgres with pgvector
- A **Gemini API key** — [aistudio.google.com](https://aistudio.google.com/apikey). The free tier is sufficient; see [Cost](#cost).

### 1. Install

```bash
git clone https://github.com/mansi-jayswal/RAG-chatbot.git
cd RAG-chatbot
npm install
```

### 2. Configure

Create `.env.local` in the project root:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5433/rag
GEMINI_API_KEY=your-key-here
```

> Port **5433**, not the usual 5432 — see [Notes on ports](#notes-on-ports).

### 3. Start the database and apply migrations

```bash
npm run db:up       # starts Postgres + pgvector on :5433
npm run db:migrate  # creates the tables and the HNSW index
```

### 4. Run the app

```bash
npm run dev
```

Open **http://localhost:3001**.

> Next prints the port it actually chose — read that line. This project runs on **3001** because another service holds 3000 on the development machine.

### 5. Build the search index

With the dev server running, in a second terminal:

```bash
npm run db:ingest
```

This embeds the corpus and populates the `chunks` table. Until you run it, the app will tell you plainly that answers aren't grounded yet, rather than pretending otherwise.

You should see something like:

```json
{
  "ok": true,
  "mode": "incremental",
  "destinations": 20,
  "embedded": { "destinations": 20, "chunks": 100 },
  "unchanged": { "chunks": 0 },
  "dimensions": 1536
}
```

Now ask it something.

## Scripts

| Script                               | What it does                                      |
| ------------------------------------ | ------------------------------------------------- |
| `npm run dev`                        | Dev server (see the printed port — **3001** here) |
| `npm run build`                      | Production build                                  |
| `npm run start`                      | Serve the production build                        |
| `npm run lint`                       | ESLint                                            |
| `npm run typecheck`                  | `tsc --noEmit`                                    |
| `npm run db:up` / `db:down`          | Start / stop Postgres                             |
| `npm run db:reset`                   | **Destroys the volume** and restarts empty        |
| `npm run db:generate` / `db:migrate` | Generate / apply Drizzle migrations               |
| `npm run db:studio`                  | Drizzle Studio                                    |
| `npm run db:psql`                    | psql shell into the container                     |
| `npm run db:ingest`                  | `POST /api/ingest` — embeds only what changed     |

## Project structure

```
src/
├── app/
│   ├── _components/        UI — hero, chat, destination cards, sections
│   ├── api/
│   │   ├── chat/           POST: retrieve → generate → stream
│   │   └── ingest/         POST: dev-only incremental corpus ingest
│   ├── globals.css         Tailwind v4 theme + design tokens
│   ├── layout.tsx          Fonts, metadata
│   └── page.tsx            The single page
├── components/ui/          shadcn primitives
├── data/
│   └── destinations.ts     The corpus — typed, hand-written
├── db/
│   ├── index.ts            pg Pool cached on globalThis
│   └── schema.ts           destinations + chunks (HNSW)
└── lib/
    ├── catalog.ts          Presentation view of the corpus
    ├── corpus-status.ts    Server-side index health
    ├── embed.ts            Batched embedding
    ├── gemini.ts           Client + model configuration
    └── retrieve.ts         Cosine search + metadata filters
```

## Adding a destination

1. Append an object to `destinations` in `src/data/destinations.ts` — the type enforces the shape, including a tagline and an image.
2. Write each of the five sections so it stands alone. A section is retrieved _without_ its siblings, so it must name the destination itself and stay on its own topic.
3. Run `npm run db:ingest`.

Ingest is **incremental**: only sections whose prose actually changed are re-embedded. Adding one destination costs five embeddings, rewording a paragraph costs one, and re-running with no changes costs nothing at all. Metadata (tags, `bestMonths`, budget tier) is rewritten every time, because it isn't part of the embedded text — so retagging is free.

## Implementation notes

Things that are easy to get wrong here, and why the code looks the way it does:

- **Embeddings are pinned to 1536 dimensions**, not the model's 3072 default, because **pgvector cannot HNSW-index a vector wider than 2000 dimensions**. Changing this means a migration _and_ re-embedding everything.
- **Order by the raw distance operator.** `ORDER BY embedding <=> $1` ascending uses the HNSW index; the equivalent-looking `desc(1 - cosineDistance(...))` returns identical rows but silently falls back to a sequential scan plus sort.
- **pgvector post-filters.** An HNSW scan takes `hnsw.ef_search` candidates _and then_ applies `WHERE`, so a filtered query can return fewer rows than asked for. Filtered searches run inside a transaction with `hnsw.iterative_scan` and a raised `ef_search` — `SET LOCAL` outside a transaction is a silent no-op.
- **Batch embedding needs each input wrapped as its own `Content`.** A bare `string[]` type-checks fine and returns **one** embedding for the whole batch.
- **The chat model is a fallback chain.** Gemini returns 503 on its newest models under load, and the SDK's internal retries can take ~55s to surface that. Each attempt is capped at 12s so an overloaded model is abandoned quickly.
- **The `pg` Pool is cached on `globalThis`.** Without it, HMR leaks a pool per save until Postgres refuses connections.
- **`/api/ingest` is guarded by `NODE_ENV`.** It rewrites the corpus tables; the guard is load-bearing.

## Cost

Every model used here has a free tier, and the project is designed to stay inside it:

- `gemini-embedding-2`, `gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`
- Exceeding a free-tier limit returns `429 RESOURCE_EXHAUSTED` — it never silently bills. Charges only become possible if a billing account is linked to the Google Cloud project.
- Incremental ingest matters for this: a **full** re-embed of 100 chunks exceeds the embedding endpoint's 100-requests-per-minute free quota and fails partway through. Normal incremental runs are nowhere near it.

## Notes on ports

Both defaults are shifted to avoid collisions with other services on the development machine:

| Service         | Port     | Instead of |
| --------------- | -------- | ---------- |
| Next dev server | **3001** | 3000       |
| Postgres        | **5433** | 5432       |

Next chooses its own port if 3000 is taken and prints it on startup — trust that line over this table.

## Accessibility and design

- Light and dark themes are both hand-tuned and driven by `prefers-color-scheme`; the dark palette is designed, not inverted.
- The text/background pairs that carry copy were measured against WCAG AA, including white type over the hero photograph.
- Every GSAP effect sits inside a `prefers-reduced-motion` branch, and nothing is hidden by CSS — a visit without JavaScript still renders the finished page.
- Model output is rendered through a strict Markdown tag allow-list with raw HTML disabled, so text that passes through the model cannot inject markup.

## Design document

`spec/initialsetup.md` is the authoritative record of the infrastructure decisions — what was chosen, what was rejected, and why. Worth reading before changing anything architectural.

## Credits

Destination photography from [Unsplash](https://unsplash.com), used under the Unsplash License.
