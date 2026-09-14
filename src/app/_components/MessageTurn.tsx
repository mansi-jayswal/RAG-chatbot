import { RotateCcw } from "lucide-react";
import AnswerMarkdown from "./AnswerMarkdown";
import Sources from "./Sources";
import type { ChatMessage } from "./types";

function PendingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-pulse rounded-full bg-marigold"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span>Looking through the guides and writing an answer…</span>
    </div>
  );
}

type Props = {
  message: ChatMessage;
  /** True while this turn is awaiting its first token. */
  pending: boolean;
  onRetry: (message: ChatMessage) => void;
  canRetry: boolean;
};

export default function MessageTurn({
  message,
  pending,
  onRetry,
  canRetry,
}: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] min-w-0 rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[0.95rem] leading-7 wrap-break-word whitespace-pre-wrap text-secondary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="mb-2 flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        <span
          className="inline-block h-px w-4 bg-marigold"
          aria-hidden="true"
        />
        Rootwise
      </p>

      {pending ? <PendingIndicator /> : null}

      {message.content ? <AnswerMarkdown content={message.content} /> : null}

      {message.aborted ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Stopped by you
          {message.content ? " mid-answer" : " before any tokens arrived"}.
        </p>
      ) : null}

      {message.error ? (
        <div
          role="alert"
          className="mt-2 rounded-xl border border-error-border bg-error-surface p-3 text-sm text-error"
        >
          <p className="mb-1 font-semibold">That request failed</p>
          <p className="leading-6 wrap-break-word whitespace-pre-wrap">
            {message.error}
          </p>
          <button
            type="button"
            onClick={() => onRetry(message)}
            disabled={!canRetry}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-error-border px-2.5 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error-border/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : null}

      {message.sources ? <Sources sources={message.sources} /> : null}
    </div>
  );
}
