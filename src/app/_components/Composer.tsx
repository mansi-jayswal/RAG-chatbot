"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  /** True while a response is in flight — the composer locks and offers Stop. */
  busy: boolean;
};

const MAX_TEXTAREA_HEIGHT = 200;

export default function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea with its content, up to a cap, then scroll internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  // Return focus to the input once a turn finishes.
  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  const canSend = !busy && value.trim().length > 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
      className="flex items-end gap-2 rounded-2xl border border-border-subtle bg-surface p-2 shadow-sm focus-within:border-muted-foreground"
    >
      <label className="sr-only" htmlFor="chat-input">
        Ask about a destination
      </label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={busy}
        placeholder={
          busy ? "Waiting for the answer…" : "Ask about a destination…"
        }
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        className="min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60"
      />
      {busy ? (
        <button
          type="button"
          onClick={onStop}
          className="shrink-0 rounded-xl border border-border-subtle px-3.5 py-2 text-sm font-medium hover:bg-surface-muted"
        >
          Stop
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSend}
          className="shrink-0 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      )}
    </form>
  );
}
