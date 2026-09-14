import { AlertTriangle, Sparkles } from "lucide-react";
import type { CorpusStatus } from "./types";

const EXAMPLE_PROMPTS = [
  "Plan three days in Udaipur.",
  "Where should I go in December — beaches or hills?",
  "Which temple towns have the best street food?",
  "I have a week in Rajasthan. Build me a route.",
];

function CorpusNotice({ corpus }: { corpus: CorpusStatus }) {
  if (corpus.state === "ready") return null;

  const message =
    corpus.state === "empty"
      ? "The destination guides are still being indexed, so answers will not be based on them yet."
      : "The destination guides cannot be reached right now, so answers will not be based on them.";

  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-2.5 rounded-xl border border-marigold/35 bg-marigold/10 px-3.5 py-3 text-sm leading-6"
    >
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0 text-marigold"
        aria-hidden="true"
      />
      <p>{message}</p>
    </div>
  );
}

export default function EmptyState({
  onPick,
  corpus,
}: {
  onPick: (prompt: string) => void;
  corpus: CorpusStatus;
}) {
  return (
    <div className="mx-auto max-w-xl py-2">
      <CorpusNotice corpus={corpus} />

      <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
        Where would you like to go?
      </h2>
      <p className="mt-2 text-[0.95rem] leading-7 text-muted-foreground">
        {corpus.state === "ready"
          ? `Ask about any of ${corpus.destinations} destinations across India. Every answer is
             written from our hand-written destination guides, and shows the exact
             passages it used.`
          : `Ask about any of the destinations across India. Every answer is assembled from
             our hand-written destination guides, and shows the exact passages it used.`}
      </p>

      <p className="mt-7 mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        <Sparkles className="size-3.5 text-marigold" aria-hidden="true" />
        Try one
      </p>
      <ul className="flex flex-col gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onPick(prompt)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-[0.95rem] leading-6 transition-colors hover:border-marigold/50 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
