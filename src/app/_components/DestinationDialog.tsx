"use client";

import { CalendarRange, MapPin, MessageSquareText, Wallet } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Destination, SectionName } from "@/data/destinations";
import {
  BUDGET_LABELS,
  monthRange,
  photoUrl,
  SECTION_LABELS,
} from "@/lib/catalog";
import { useChatPrefill } from "./chat-prefill";

/**
 * Deterministic warm gradient per destination. It sits behind every photo, so a
 * slow network shows a tinted surface rather than a grey hole, and a photo that
 * 404s leaves something intentional-looking behind.
 */
const FALLBACKS = [
  "linear-gradient(135deg,#b44a28,#e4820b)",
  "linear-gradient(135deg,#1e2a5a,#b44a28)",
  "linear-gradient(135deg,#7a5a2e,#e4820b)",
  "linear-gradient(135deg,#25503f,#b4670a)",
];

export function fallbackFor(slug: string): string {
  let hash = 0;
  for (const character of slug)
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return FALLBACKS[Math.abs(hash) % FALLBACKS.length];
}

/** Overview first, then the order a traveller actually asks in. */
const SECTION_ORDER: SectionName[] = [
  "overview",
  "attractions",
  "food",
  "gettingAround",
  "whenToGo",
];

/**
 * The detail view for one destination, rendered straight from the local corpus
 * — no API call, no tokens spent. The one button inside hands a question to the
 * chat instead of answering here, which is the only path that cites sources.
 */
export default function DestinationDialog({
  destination,
  children,
}: {
  destination: Destination;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const prefill = useChatPrefill();

  const handleAsk = () => {
    setOpen(false);
    prefill(`Plan a three-day trip to ${destination.name}.`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[88dvh] gap-3 overflow-y-auto sm:max-w-2xl">
        <div className="relative -mx-4 -mt-4 h-40 overflow-hidden rounded-t-xl sm:h-48">
          <div
            className="absolute inset-0"
            style={{ backgroundImage: fallbackFor(destination.slug) }}
            aria-hidden="true"
          />
          <Image
            src={photoUrl(destination.image.id, { w: 1200, h: 480 })}
            alt={destination.image.alt}
            fill
            sizes="(max-width: 768px) 100vw, 42rem"
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-popover via-popover/25 to-transparent"
            aria-hidden="true"
          />
        </div>

        <div className="px-0.5">
          <DialogTitle className="font-display text-2xl font-semibold tracking-tight">
            {destination.name}
          </DialogTitle>
          <DialogDescription className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" />
              {destination.country}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="size-3.5" aria-hidden="true" />
              {monthRange(destination.bestMonths, true)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="size-3.5" aria-hidden="true" />
              {BUDGET_LABELS[destination.budgetTier]}
            </span>
          </DialogDescription>
        </div>

        <Tabs defaultValue="overview" className="mt-1 gap-3">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="h-auto">
              {SECTION_ORDER.map((section) => (
                <TabsTrigger
                  key={section}
                  value={section}
                  className="whitespace-nowrap"
                >
                  {SECTION_LABELS[section]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {SECTION_ORDER.map((section) => (
            <TabsContent
              key={section}
              value={section}
              className="text-[0.95rem] leading-7 text-foreground/90"
            >
              {destination.sections[section]}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {destination.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="border font-normal">
              {tag}
            </Badge>
          ))}
        </div>

        <Button onClick={handleAsk} className="w-full sm:w-fit">
          <MessageSquareText aria-hidden="true" />
          Ask Rootwise about {destination.name}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
