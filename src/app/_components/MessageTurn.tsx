import Sources from "./Sources";
import type { ChatMessage } from "./types";

function PendingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span>Retrieving context and drafting an answer…</span>
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
        <div className="max-w-[85%] min-w-0 rounded-2xl rounded-br-md border border-border-subtle bg-surface-muted px-4 py-2.5 text-sm leading-7 whitespace-pre-wrap wrap-break-word">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Assistant
      </p>

      {pending ? <PendingIndicator /> : null}

      {message.content ? (
        <div className="text-[0.95rem] leading-7 whitespace-pre-wrap wrap-break-word">
          {message.content}
        </div>
      ) : null}

      {message.aborted ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Stopped by you{message.content ? " mid-answer" : " before any tokens arrived"}.
        </p>
      ) : null}

      {message.error ? (
        <div
          role="alert"
          className="mt-2 rounded-lg border border-error-border bg-error-surface p-3 text-sm text-error"
        >
          <p className="mb-1 font-medium">Request failed</p>
          <p className="leading-6 whitespace-pre-wrap wrap-break-word">
            {message.error}
          </p>
          <button
            type="button"
            onClick={() => onRetry(message)}
            disabled={!canRetry}
            className="mt-2 rounded-md border border-error-border px-2.5 py-1 text-xs font-medium text-error hover:bg-error-border/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      ) : null}

      {message.sources ? <Sources sources={message.sources} /> : null}
    </div>
  );
}
