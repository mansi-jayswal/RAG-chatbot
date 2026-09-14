"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

/**
 * Lets the destination cards hand a question to the chat without lifting the
 * whole conversation into the page: `Chat` owns its streaming state exactly as
 * before, and simply registers a handler here while it is mounted.
 *
 * Deliberately a callback rather than shared state — a click calls straight
 * into the chat, so there is no render pass in between and nothing has to watch
 * for changes.
 *
 * A prefill never sends. The visitor still presses Enter: clicking a card
 * should not spend a model call from the shared free-tier quota.
 */
type PrefillHandler = (text: string) => void;

type PrefillContextValue = {
  /** Called by cards, chips and the section buttons. */
  prefill: PrefillHandler;
  /** Called by `Chat` on mount, and with `null` on unmount. */
  setHandler: (handler: PrefillHandler | null) => void;
};

const PrefillContext = createContext<PrefillContextValue | null>(null);

export function ChatPrefillProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<PrefillHandler | null>(null);

  const prefill = useCallback((text: string) => {
    handlerRef.current?.(text);
  }, []);

  const setHandler = useCallback((handler: PrefillHandler | null) => {
    handlerRef.current = handler;
  }, []);

  const value = useMemo(() => ({ prefill, setHandler }), [prefill, setHandler]);

  return (
    <PrefillContext.Provider value={value}>{children}</PrefillContext.Provider>
  );
}

function usePrefillContext(): PrefillContextValue {
  const value = useContext(PrefillContext);
  if (!value) {
    throw new Error(
      "Chat prefill hooks must be used inside <ChatPrefillProvider>",
    );
  }
  return value;
}

/** For anything that wants to *send* a question to the composer. */
export function useChatPrefill(): PrefillHandler {
  return usePrefillContext().prefill;
}

/** For the chat itself, which *receives* them. */
export function usePrefillHandlerSlot(): (
  handler: PrefillHandler | null,
) => void {
  return usePrefillContext().setHandler;
}
