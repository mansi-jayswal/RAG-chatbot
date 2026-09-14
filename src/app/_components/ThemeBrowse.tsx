"use client";

import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { themes } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useChatPrefill } from "./chat-prefill";
import DestinationChips from "./DestinationChips";
import SectionHeading from "./SectionHeading";

/**
 * Themes are an editorial grouping over the raw corpus tags, with counts
 * derived from the data — a visitor thinks "hills", not "himalayas OR tea".
 */
export default function ThemeBrowse() {
  const [activeId, setActiveId] = useState(themes[0]?.id ?? "");
  const prefill = useChatPrefill();

  const active = themes.find((theme) => theme.id === activeId) ?? themes[0];
  if (!active) return null;

  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <SectionHeading
          eyebrow="Browse by theme"
          title="What kind of trip is it?"
          lede="Every destination is tagged by the kind of trip it suits. Pick a theme to see which places match."
        />

        <div
          className="mt-9 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Trip themes"
        >
          {themes.map((theme) => {
            const selected = theme.id === active.id;
            return (
              <button
                key={theme.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="theme-panel"
                onClick={() => setActiveId(theme.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                  selected
                    ? "border-transparent bg-primary font-semibold text-primary-foreground"
                    : "border-border bg-card hover:border-marigold/50 hover:bg-card",
                )}
              >
                {theme.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[0.7rem] tabular-nums",
                    selected ? "bg-white/20" : "bg-muted text-muted-foreground",
                  )}
                >
                  {theme.destinations.length}
                </span>
              </button>
            );
          })}
        </div>

        <div
          id="theme-panel"
          role="tabpanel"
          aria-label={active.label}
          className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <DestinationChips destinations={active.destinations} />
          <Button
            variant="outline"
            className="mt-5"
            onClick={() =>
              prefill(
                `I'm interested in ${active.label.toLowerCase()}. Which destinations suit that, and why?`,
              )
            }
          >
            <MessageSquareText aria-hidden="true" />
            Ask about {active.label.toLowerCase()}
          </Button>
        </div>
      </div>
    </section>
  );
}
