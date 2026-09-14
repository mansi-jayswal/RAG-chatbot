import { count, countDistinct } from "drizzle-orm";
import { cache } from "react";
import type { CorpusStatus } from "@/app/_components/types";
import { db, schema } from "@/db";

/**
 * How much of the corpus is actually indexed, read on the server so the page
 * never claims to be grounded while `chunks` is empty. `cache` dedupes the
 * query across a single render; a failure degrades to a banner rather than
 * taking the whole homepage down with a 500.
 */
export const getCorpusStatus = cache(async (): Promise<CorpusStatus> => {
  try {
    const [row] = await db
      .select({
        sections: count(schema.chunks.id),
        destinations: countDistinct(schema.chunks.destinationSlug),
      })
      .from(schema.chunks);

    if (!row || row.sections === 0) return { state: "empty" };

    return {
      state: "ready",
      destinations: row.destinations,
      sections: row.sections,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[corpus-status] could not read the chunk count:", error);
    }
    return { state: "unavailable" };
  }
});
