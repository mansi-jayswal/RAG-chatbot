/** A retrieved chunk, as reported by the `X-Rag-Sources` response header. */
export type Source = {
  slug: string;
  name: string;
  section: string;
  score: number;
};

/** Wire shape accepted by `POST /api/chat`. */
export type WireMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * A turn as held in React state (spec decision 10: never persisted).
 * `id` is local-only and is stripped before the message goes over the wire.
 */
export type ChatMessage = WireMessage & {
  id: string;
  /** Present once the response headers have been read. */
  sources?: Source[];
  /** Plain-text error body from a non-200 response, or a client-side failure. */
  error?: string;
  /** True when the user aborted this turn mid-stream. */
  aborted?: boolean;
};

export type ChatStatus = "idle" | "pending" | "streaming";
