"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Composer from "./Composer";
import EmptyState from "./EmptyState";
import MessageTurn from "./MessageTurn";
import type { ChatMessage, ChatStatus, Source } from "./types";

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

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [input, setInput] = useState("");
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-border-subtle">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Rootwise</h1>
            <p className="truncate text-xs text-muted-foreground">
              Retrieval-grounded answers · history is not saved
            </p>
          </div>
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="shrink-0 rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs font-medium hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              New chat
            </button>
          ) : null}
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState onPick={send} />
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

      <div className="border-t border-border-subtle">
        <div className="relative mx-auto w-full max-w-3xl px-4 py-3">
          {!pinnedToBottom && messages.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                scrollToBottom();
                pinnedRef.current = true;
                setPinnedToBottom(true);
              }}
              className="absolute -top-11 left-1/2 -translate-x-1/2 rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-surface-muted"
            >
              Jump to latest
            </button>
          ) : null}
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => send(input)}
            onStop={stop}
            busy={busy}
          />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
