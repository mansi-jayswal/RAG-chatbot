import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { HERO_PHOTO, photoUrl } from "@/lib/catalog";
import Chat from "./Chat";
import type { CorpusStatus } from "./types";

export default function Hero({
  corpus,
  destinationCount,
}: {
  corpus: CorpusStatus;
  destinationCount: number;
}) {
  return (
    <section id="plan" className="relative isolate overflow-hidden">
      {/* The photo sits in an oversized box so the parallax shift never
          exposes an edge. GSAP targets it by `data-hero-photo`. */}
      <div
        className="absolute inset-x-0 -top-[15%] -z-10 h-[130%]"
        data-hero-photo
      >
        <Image
          src={photoUrl(HERO_PHOTO.id, { w: 2400 })}
          alt={HERO_PHOTO.alt}
          fill
          preload
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, var(--scrim-from) 0%, var(--scrim-from) 40%, var(--scrim-to) 72%, var(--background) 100%)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-3xl px-4 pt-32 pb-16 sm:px-6 sm:pt-40 sm:pb-20">
        <div className="text-center" data-reveal>
          <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-white uppercase">
            {destinationCount} destinations · hand-written guides
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.1] font-semibold text-balance text-white sm:text-5xl md:text-6xl">
            Ask anything about
            <span className="relative mx-2 inline-block whitespace-nowrap">
              travelling India
              <span
                className="absolute inset-x-0 -bottom-1 h-[3px] rounded-full bg-marigold-bright"
                aria-hidden="true"
              />
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[1.05rem] leading-8 text-white">
            Temple towns, desert forts, backwaters and tea hills — answered from
            hand-written destination guides, with the exact passages shown
            beneath every reply.
          </p>
        </div>

        <div className="mt-10" data-reveal>
          <Chat corpus={corpus} />
        </div>

        <a
          href="#destinations"
          className="mx-auto mt-10 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm text-foreground/70 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Or browse the destinations
          <ChevronDown className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
