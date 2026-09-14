import type { Source } from "./types";

function formatScore(score: unknown): string {
  return typeof score === "number" && Number.isFinite(score)
    ? score.toFixed(4)
    : String(score ?? "—");
}

/**
 * Compact, collapsible list of the chunks that grounded an answer.
 * Nothing is persisted (spec decision 10), so this is the only place the
 * retrieval trace for a turn is ever visible — keep it always rendered when a
 * header arrived, including the zero-source case.
 */
export default function Sources({ sources }: { sources: Source[] }) {
  return (
    <details className="mt-3.5 overflow-hidden rounded-xl border border-border bg-muted/60">
      <summary className="cursor-pointer list-none px-3.5 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors select-none hover:text-foreground">
        Where this came from ({sources.length})
      </summary>
      {sources.length === 0 ? (
        <p className="border-t border-border px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Nothing in the guides matched this question, so the answer above is
          not based on them.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {sources.map((source, index) => (
            <li
              key={`${source.slug}-${source.section}-${index}`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3.5 py-2.5 text-xs"
            >
              <span className="font-semibold break-words">{source.name}</span>
              <span className="break-words text-muted-foreground">
                {source.section}
              </span>
              <span className="ml-auto font-mono tabular-nums text-muted-foreground">
                {formatScore(source.score)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
