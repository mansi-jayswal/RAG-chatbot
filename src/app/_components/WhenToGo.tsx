"use client";

import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { byMonth, MONTH_ABBR, MONTHS } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useChatPrefill } from "./chat-prefill";
import DestinationChips from "./DestinationChips";
import SectionHeading from "./SectionHeading";

/**
 * Built entirely from each destination's `bestMonths`. `initialMonth` arrives
 * from the server so the first render matches — reading the clock on the client
 * would be a hydration mismatch.
 */
export default function WhenToGo({ initialMonth }: { initialMonth: number }) {
  const [month, setMonth] = useState(initialMonth);
  const prefill = useChatPrefill();

  const matches = byMonth[month - 1] ?? [];
  const monthName = MONTHS[month - 1];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <SectionHeading
        eyebrow="When to go"
        title="Pick a month, see where it works"
        lede="India does not have one season. These are the months each destination's own guide recommends."
      />

      <div className="mt-9 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        {MONTH_ABBR.map((abbr, index) => {
          const value = index + 1;
          const selected = value === month;
          const total = byMonth[index].length;
          return (
            <button
              key={abbr}
              type="button"
              onClick={() => setMonth(value)}
              aria-pressed={selected}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                selected
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-marigold/50 hover:bg-muted",
              )}
            >
              <span className="text-sm font-semibold">{abbr}</span>
              <span
                className={cn(
                  "text-[0.7rem] tabular-nums",
                  selected
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {total}
              </span>
              <span className="sr-only">
                {MONTHS[index]}: {total} destinations
              </span>
            </button>
          );
        })}
      </div>

      <div
        aria-live="polite"
        className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <h3 className="mb-4 text-sm font-semibold">
          {matches.length} destinations suit {monthName}
        </h3>
        {matches.length > 0 ? (
          <DestinationChips destinations={matches} />
        ) : (
          <p className="text-sm text-muted-foreground">
            None of our guides recommend {monthName}.
          </p>
        )}
        <Button
          variant="outline"
          className="mt-5"
          onClick={() =>
            prefill(`Where should I travel in India in ${monthName}, and why?`)
          }
        >
          <MessageSquareText aria-hidden="true" />
          Ask about {monthName}
        </Button>
      </div>
    </section>
  );
}
