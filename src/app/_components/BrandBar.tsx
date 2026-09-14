"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import BrandMark from "./BrandMark";

const LINKS = [
  { id: "plan", label: "Plan a trip" },
  { id: "destinations", label: "Destinations" },
  { id: "how-it-works", label: "How it works" },
] as const;

export default function BrandBar({ tagline }: { tagline: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  // The bar is transparent over the hero photo and solid everywhere else.
  //
  // It must become opaque *before* any hero text can slide underneath it: the
  // heading starts 128px down and the bar is ~57px tall, so the first overlap
  // is possible at 71px of scroll. Solidifying at 32px leaves a clear margin.
  // A translucent bar here is what caused the heading to show through it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight whichever anchored section currently owns the upper viewport.
  useEffect(() => {
    const sections = LINKS.map((link) =>
      document.getElementById(link.id),
    ).filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-border bg-background shadow-[0_2px_20px_-12px_rgb(0_0_0/0.5)]"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <a
          href="#top"
          className={cn(
            "flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            scrolled ? "text-foreground" : "text-white",
          )}
        >
          <BrandMark
            className={cn(
              "size-7 shrink-0",
              scrolled ? "text-marigold" : "text-white",
            )}
          />
          <span className="min-w-0">
            <span className="block font-display text-lg leading-none font-semibold tracking-tight">
              Rootwise
            </span>
            <span
              className={cn(
                "mt-1 hidden text-[0.7rem] leading-none md:block",
                scrolled ? "text-muted-foreground" : "text-white/85",
              )}
            >
              {tagline}
            </span>
          </span>
        </a>

        <nav
          aria-label="Sections"
          className="ml-auto hidden items-center gap-0.5 sm:flex"
        >
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              aria-current={active === link.id ? "true" : undefined}
              className={cn(
                "rounded-lg px-2.5 py-2 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                scrolled
                  ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "text-white/95 hover:bg-white/15 hover:text-white",
                active === link.id &&
                  (scrolled
                    ? "bg-muted font-semibold text-foreground"
                    : "bg-white/15 font-semibold text-white"),
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
