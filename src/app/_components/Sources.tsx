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
    <details className="mt-3 overflow-hidden rounded-lg border border-border-subtle bg-surface-muted">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground select-none hover:text-foreground">
        Sources ({sources.length})
      </summary>
      {sources.length === 0 ? (
        <p className="border-t border-border-subtle px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          No chunks were retrieved for this turn. If the answer looks
          ungrounded, the corpus is probably still empty — run{" "}
          <code className="font-mono">npm run db:ingest</code>.
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle border-t border-border-subtle">
          {sources.map((source, index) => (
            <li
              key={`${source.slug}-${source.section}-${index}`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-2 text-xs"
            >
              <span className="font-medium break-words">{source.name}</span>
              <span className="text-muted-foreground break-words">
                {source.section}
              </span>
              <span className="ml-auto font-mono text-muted-foreground">
                {formatScore(source.score)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
