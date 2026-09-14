"use client";

import type { Destination } from "@/data/destinations";
import DestinationDialog from "./DestinationDialog";

/**
 * Every destination in the corpus, not just the six featured above. Each chip
 * opens the same detail dialog the cards do — one entity, one behaviour.
 */
export default function DestinationChips({
  destinations,
}: {
  destinations: Destination[];
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {destinations.map((destination) => (
        <li key={destination.slug}>
          <DestinationDialog destination={destination}>
            <button
              type="button"
              className="rounded-full border border-border bg-card px-3.5 py-2 text-sm transition-colors hover:border-marigold/50 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              {destination.name}
            </button>
          </DestinationDialog>
        </li>
      ))}
    </ul>
  );
}
