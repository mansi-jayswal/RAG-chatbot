const EXAMPLE_PROMPTS = [
  "Plan a 3-day itinerary for mathura in April.",
  "Which destination suits a mid-range budget and great food?",
  "Where should I go for temples and walkable streets?",
  "What are the best months to visit, and why those months?",
];

export default function EmptyState({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <h2 className="text-lg font-semibold">Rootwise</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">
        Ask about a destination and the answer is generated from a small,
        hand-authored corpus of destination write-ups: your question is embedded,
        the closest prose sections are retrieved from Postgres/pgvector, and only
        those sections are handed to the model. Every answer shows the chunks
        behind it under <span className="font-medium">Sources</span>.
      </p>

      <div className="mt-4 rounded-lg border border-border-subtle bg-surface-muted p-3 text-sm leading-7">
        <p className="font-medium">The corpus starts empty.</p>
        <p className="text-muted-foreground">
          Until it is ingested, answers will have no sources. With the dev server
          running, ingest it once with{" "}
          <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[0.85em]">
            npm run db:ingest
          </code>{" "}
          — it POSTs to{" "}
          <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[0.85em]">
            /api/ingest
          </code>
          .
        </p>
      </div>

      <p className="mt-6 mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Try one
      </p>
      <ul className="flex flex-col gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onPick(prompt)}
              className="w-full rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-left text-sm leading-6 hover:bg-surface-muted"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs leading-6 text-muted-foreground">
        This conversation lives in memory only — it is not saved and a refresh
        clears it.
      </p>
    </div>
  );
}
