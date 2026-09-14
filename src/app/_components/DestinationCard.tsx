"use client";

import { CalendarRange } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { Destination } from "@/data/destinations";
import { BUDGET_LABELS, monthRange, photoUrl } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import DestinationDialog, { fallbackFor } from "./DestinationDialog";

export default function DestinationCard({
  destination,
  className,
}: {
  destination: Destination;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <DestinationDialog destination={destination}>
      <button
        type="button"
        data-card
        className={cn(
          "group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-[box-shadow,border-color,transform] hover:-translate-y-0.5 hover:border-marigold/40 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none motion-reduce:hover:translate-y-0",
          className,
        )}
      >
        <div className="relative aspect-4/3 w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ backgroundImage: fallbackFor(destination.slug) }}
            aria-hidden="true"
          />
          {imageFailed ? null : (
            <Image
              src={photoUrl(destination.image.id, { w: 800, h: 600 })}
              alt={destination.image.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 22rem"
              onError={() => setImageFailed(true)}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          )}
          <div
            className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/60 to-transparent"
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
            <h3 className="font-display text-xl leading-tight font-semibold text-white drop-shadow-sm">
              {destination.name}
            </h3>
            <span className="shrink-0 rounded-full bg-black/45 px-2 py-1 text-[0.7rem] font-medium text-white backdrop-blur-sm">
              {BUDGET_LABELS[destination.budgetTier]}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <p className="text-[0.95rem] leading-6 text-foreground/85">
            {destination.tagline}
          </p>
          <p className="mt-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarRange className="size-3.5 shrink-0" aria-hidden="true" />
            Best {monthRange(destination.bestMonths, true)}
          </p>
        </div>
      </button>
    </DestinationDialog>
  );
}
