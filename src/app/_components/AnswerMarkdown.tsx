import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders a model answer as Markdown.
 *
 * Gemini formats its answers in Markdown whether or not it is asked to, so the
 * alternative to rendering it is showing the reader raw `**asterisks**`.
 *
 * Safety: `rehype-raw` is deliberately *not* installed, so any HTML in the
 * model's output is escaped rather than executed, and `allowedElements` keeps
 * the output to the tags styled below. Model text is untrusted input — it can
 * echo back anything a visitor typed — so this stays a strict allow-list.
 *
 * Headings are all rendered at one visual level: the page already owns `h1`
 * and its section headings, and a model deciding to emit `#` should not be able
 * to outrank them or punch a hole in the document outline.
 */
const ALLOWED_ELEMENTS = [
  "p",
  "br",
  "strong",
  "em",
  "del",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "code",
  "pre",
  "a",
  "blockquote",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

/** Every heading level collapses to this one. */
function AnswerHeading({ children }: { children?: React.ReactNode }) {
  return (
    <h4 className="mt-4 mb-2 font-display text-[1.05rem] font-semibold tracking-tight first:mt-0">
      {children}
    </h4>
  );
}

export default function AnswerMarkdown({ content }: { content: string }) {
  return (
    <div
      className={[
        "text-[0.98rem] leading-7 wrap-break-word",
        // Inline `code` is styled below; the same element inside a fenced block
        // must not be boxed twice.
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
      ].join(" ")}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => (
            <del className="text-muted-foreground line-through">{children}</del>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="marker:text-marigold">{children}</li>
          ),
          h1: AnswerHeading,
          h2: AnswerHeading,
          h3: AnswerHeading,
          h4: AnswerHeading,
          h5: AnswerHeading,
          h6: AnswerHeading,
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-xl bg-muted p-3.5 font-mono text-[0.85em] leading-6 last:mb-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-marigold/60 pl-3.5 text-muted-foreground italic last:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener nofollow"
              className="font-medium text-marigold underline underline-offset-2 hover:no-underline"
            >
              {children}
            </a>
          ),
          // Tables get their own horizontal scroller — the chat card is narrow
          // and the page itself must never scroll sideways.
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto last:mb-0">
              <table className="w-full border-collapse text-[0.9em]">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-muted px-2.5 py-1.5 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2.5 py-1.5 align-top">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
