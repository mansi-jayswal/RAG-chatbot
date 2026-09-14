import { Database, FileSearch, Quote } from "lucide-react";
import { destinations } from "@/data/destinations";
import { CORPUS_SECTION_COUNT } from "@/lib/catalog";
import SectionHeading from "./SectionHeading";

const STEPS = [
  {
    icon: FileSearch,
    title: "Your question becomes a vector",
    body: "The question is embedded with Gemini's embedding model at 1536 dimensions — small enough for Postgres to index, detailed enough to tell a beach from a jyotirlinga.",
  },
  {
    icon: Database,
    title: "Postgres finds the closest passages",
    body: `pgvector runs a cosine similarity search across all ${CORPUS_SECTION_COUNT} hand-written passages and returns only the handful that actually match.`,
  },
  {
    icon: Quote,
    title: "Only those passages reach the model",
    body: "The answer is written from the retrieved text and nothing else, and every reply lists the passages it used so you can check it.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-t border-border bg-muted/40"
      data-steps-section
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="Answers you can check"
          lede="Rootwise does not free-associate about India. It retrieves, then writes — and shows its working."
        />

        <ol className="mt-10 grid gap-5 md:grid-cols-3" data-steps>
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              data-step
              className="rounded-2xl border border-border bg-card p-6 transition-[border-color,box-shadow] data-active:border-marigold/50 data-active:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-xs tracking-widest text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2.5 text-[0.95rem] leading-7 text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4" data-reveal>
          {[
            { value: String(destinations.length), label: "Destinations" },
            { value: String(CORPUS_SECTION_COUNT), label: "Indexed passages" },
            { value: "1536", label: "Embedding dimensions" },
            { value: "0", label: "Chats stored" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card px-4 py-5 text-center"
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-display text-3xl font-semibold tabular-nums">
                  {stat.value}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
