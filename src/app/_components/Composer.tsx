"use client";

import { ArrowUp, Square } from "lucide-react";
import { useEffect, type RefObject } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  /** True while a response is in flight — the composer locks and offers Stop. */
  busy: boolean;
  /** Owned by `Chat`, so a destination card can focus the input from outside. */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

const MAX_TEXTAREA_HEIGHT = 200;

export default function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  textareaRef,
}: Props) {
  // Grow the textarea with its content, up to a cap, then scroll internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value, textareaRef]);

  // Return focus to the input once a turn finishes.
  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy, textareaRef]);

  const canSend = !busy && value.trim().length > 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
      className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm transition-colors focus-within:border-marigold focus-within:ring-2 focus-within:ring-ring/35"
    >
      <label className="sr-only" htmlFor="chat-input">
        Ask about a destination in India
      </label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={busy}
        enterKeyHint="send"
        placeholder={
          busy ? "Finding the answer…" : "Ask about anywhere in India…"
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
        className="min-w-0 flex-1 resize-none bg-transparent px-2.5 py-2.5 text-base leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60 sm:text-[0.95rem]"
      />
      {busy ? (
        <button
          type="button"
          onClick={onStop}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Square className="size-4 fill-current" aria-hidden="true" />
          <span className="sr-only">Stop generating</span>
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-[opacity,transform] hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
          <span className="sr-only">Send question</span>
        </button>
      )}
    </form>
  );
}
