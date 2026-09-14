"use client";

import { ArrowDown, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefillHandlerSlot } from "./chat-prefill";
import Composer from "./Composer";
import EmptyState from "./EmptyState";
import MessageTurn from "./MessageTurn";
import type { ChatMessage, ChatStatus, CorpusStatus, Source } from "./types";

/**
 * Local ids only. A module counter (rather than `crypto.randomUUID()`) keeps
 * ids deterministic and avoids any chance of an SSR/hydration mismatch.
 */
let idCounter = 0;
function nextId(role: string): string {
  idCounter += 1;
  return `${role}-${idCounter}`;
}

/** `X-Rag-Sources` is `encodeURIComponent(JSON.stringify(sources))`. */
function parseSources(header: string | null): Source[] | undefined {
  if (!header) return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(header));
    if (!Array.isArray(parsed)) return undefined;
    return parsed.filter(
      (entry): entry is Source => typeof entry === "object" && entry !== null,
    );
  } catch {
    // A malformed header must not take the answer down with it.
    return undefined;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

/** Treat "close enough to the bottom" as pinned, so streaming keeps up. */
const PIN_THRESHOLD_PX = 64;

export default function Chat({ corpus }: { corpus: CorpusStatus }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [input, setInput] = useState("");
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pinnedRef = useRef(true);

  const busy = status !== "idle";

  const patch = useCallback(
    (id: string, update: (message: ChatMessage) => ChatMessage) => {
      setMessages((prev) =>
        prev.map((message) => (message.id === id ? update(message) : message)),
      );
    },
    [],
  );

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const pinned = distance <= PIN_THRESHOLD_PX;
    pinnedRef.current = pinned;
    setPinnedToBottom(pinned);
  }, []);

  // Follow new content only while the user has not scrolled away.
  useEffect(() => {
    if (pinnedRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * Run one turn against `POST /api/chat`. `history` is the full conversation
   * to send (there is no server-side persistence — spec decision 10).
   */
  const runTurn = useCallback(
    async (history: ChatMessage[]) => {
      const controller = new AbortController();
      abortRef.current = controller;

      const assistantId = nextId("assistant");
      pinnedRef.current = true;
      setPinnedToBottom(true);
      setStatus("pending");
      setMessages([
        ...history,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
          }),
        });

        if (!response.ok) {
          // Errors are plain text; surface the server's own words.
          const detail = (await response.text().catch(() => "")).trim();
          throw new Error(
            detail || `The server responded with HTTP ${response.status}.`,
          );
        }

        const sources = parseSources(response.headers.get("X-Rag-Sources"));
        if (sources) {
          patch(assistantId, (message) => ({ ...message, sources }));
        }

        if (!response.body) {
          throw new Error("The server returned a response with no body.");
        }

        setStatus("streaming");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            patch(assistantId, (message) => ({
              ...message,
              content: message.content + chunk,
            }));
          }
        }

        const tail = decoder.decode();
        if (tail) {
          patch(assistantId, (message) => ({
            ...message,
            content: message.content + tail,
          }));
        }
      } catch (error) {
        if (isAbortError(error)) {
          // A user-initiated stop is not a failure: keep whatever streamed.
          patch(assistantId, (message) => ({ ...message, aborted: true }));
        } else {
          const detail =
            error instanceof Error && error.message
              ? error.message
              : "The request failed before a response arrived.";
          patch(assistantId, (message) => ({ ...message, error: detail }));
        }
      } finally {
        abortRef.current = null;
        setStatus("idle");
      }
    },
    [patch],
  );

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || busy) return;
      setInput("");
      const userMessage: ChatMessage = {
        id: nextId("user"),
        role: "user",
        content,
      };
      // `messages` may still hold a failed assistant turn; drop trailing
      // turns that carry no content so they never reach the model.
      const history = messages.filter(
        (message) => message.error === undefined && message.content.length > 0,
      );
      void runTurn([...history, userMessage]);
    },
    [busy, messages, runTurn],
  );

  const retry = useCallback(
    (failed: ChatMessage) => {
      if (busy) return;
      const index = messages.findIndex((message) => message.id === failed.id);
      if (index < 0) return;
      void runTurn(messages.slice(0, index));
    },
    [busy, messages, runTurn],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    if (busy) return;
    setMessages([]);
    setInput("");
    pinnedRef.current = true;
    setPinnedToBottom(true);
  }, [busy]);

  /**
   * A destination card asked a question on the visitor's behalf. Fill the
   * composer and bring it into view, but never send — see `chat-prefill.tsx`.
   * The handler runs from a click, which makes this a subscription to an
   * external event rather than setState inside an effect body.
   */
  const setPrefillHandler = usePrefillHandlerSlot();
  useEffect(() => {
    setPrefillHandler((text) => {
      setInput(text);
      cardRef.current?.scrollIntoView({ block: "center" });
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        // Caret at the end, so the user can keep typing straight away.
        textarea.setSelectionRange(text.length, text.length);
      }
    });
    return () => setPrefillHandler(null);
  }, [setPrefillHandler]);

  const lastMessage = messages[messages.length - 1];
  // The retrieval + embedding + first-token gap is several seconds long, so the
  // indicator stays up for the whole time the in-flight turn has no text yet.
  const pendingId =
    busy &&
    lastMessage?.role === "assistant" &&
    !lastMessage.content &&
    !lastMessage.error &&
    !lastMessage.aborted
      ? lastMessage.id
      : undefined;

  return (
    <div
      ref={cardRef}
      className="flex h-[clamp(26rem,68dvh,40rem)] flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-[0_24px_70px_-24px_rgba(15,12,8,0.55)] ring-1 ring-black/5 backdrop-blur-xl"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span
            className={
              corpus.state === "ready"
                ? "size-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400"
                : "size-1.5 shrink-0 rounded-full bg-marigold"
            }
            aria-hidden="true"
          />
          <span className="truncate">
            {corpus.state === "ready"
              ? `Answering from ${corpus.sections} passages across ${corpus.destinations} destination guides`
              : "Destination guides are unavailable right now"}
          </span>
        </p>
        {messages.length > 0 ? (
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            New chat
          </button>
        ) : null}
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        <div className="px-4 py-5 sm:px-5">
          {messages.length === 0 ? (
            <EmptyState onPick={send} corpus={corpus} />
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((message) => (
                <MessageTurn
                  key={message.id}
                  message={message}
                  pending={message.id === pendingId}
                  onRetry={retry}
                  canRetry={!busy}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative shrink-0 border-t border-border px-4 py-3 sm:px-5">
        {!pinnedToBottom && messages.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              scrollToBottom();
              pinnedRef.current = true;
              setPinnedToBottom(true);
            }}
            className="absolute -top-12 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium shadow-md transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowDown className="size-3.5" aria-hidden="true" />
            Jump to latest
          </button>
        ) : null}
        <Composer
          value={input}
          onChange={setInput}
          onSubmit={() => send(input)}
          onStop={stop}
          busy={busy}
          textareaRef={textareaRef}
        />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Enter to send · Shift+Enter for a new line · nothing is saved
        </p>
      </div>
    </div>
  );
}
