import {
  destinations,
  type Destination,
  type SectionName,
} from "@/data/destinations";

/**
 * Presentation-layer view of `src/data/destinations.ts`. The corpus module stays
 * a pure mirror of the database row shape (spec decisions 5-7); everything the
 * marketing page needs to group, label or illustrate that data lives here.
 */

/** Unsplash serves its own derivatives — ask for the size we actually render. */
export function photoUrl(
  id: string,
  { w, h, q = 70 }: { w: number; h?: number; q?: number },
): string {
  const params = new URLSearchParams({
    auto: "format",
    fit: "crop",
    w: String(w),
    q: String(q),
  });
  if (h) params.set("h", String(h));
  return `https://images.unsplash.com/${id}?${params.toString()}`;
}

/**
 * Behind the hero: mist over the tea hills of the eastern Himalaya.
 *
 * Chosen over a sharper landscape because the hero carries white type — its
 * brightest region is soft cloud, which under the 82% scrim still leaves white
 * text around 5.4:1. Deliberately not one of the twenty card photos either, so
 * the same image never appears twice on the page.
 */
export const HERO_PHOTO = {
  id: "photo-1766485586335-b3ecea463aa6",
  alt: "Mist drifting over tea-covered hills and forest in the eastern Himalaya",
} as const;

/**
 * Six destinations chosen to span what the corpus actually covers — one temple
 * town, two Rajasthan cities, a beach, tea hills and the Himalaya — rather than
 * the first six in the file, which are all pilgrimage sites.
 */
export const RECOMMENDED_SLUGS = [
  "varanasi",
  "jaipur",
  "udaipur",
  "goa",
  "munnar",
  "darjeeling",
] as const;

export const bySlug = new Map(destinations.map((d) => [d.slug, d]));

export const recommended: Destination[] = RECOMMENDED_SLUGS.map((slug) => {
  const destination = bySlug.get(slug);
  if (!destination) {
    throw new Error(
      `RECOMMENDED_SLUGS names "${slug}", which is not in the corpus`,
    );
  }
  return destination;
});

export const SECTION_LABELS: Record<SectionName, string> = {
  overview: "Overview",
  food: "Food",
  attractions: "What to see",
  gettingAround: "Getting around",
  whenToGo: "When to go",
};

export const BUDGET_LABELS: Record<Destination["budgetTier"], string> = {
  budget: "Budget",
  mid: "Mid-range",
  luxury: "Luxury",
};

/**
 * Themes are an editorial grouping over the raw tags: a visitor thinks "hills",
 * not "himalayas OR tea OR scenic". Counts are derived, never hand-written, so
 * adding a destination cannot leave a stale number on the page.
 */
const THEME_TAGS: { id: string; label: string; tags: string[] }[] = [
  {
    id: "spiritual",
    label: "Temples & pilgrimage",
    tags: [
      "hinduism",
      "pilgrimage",
      "temples",
      "spirituality",
      "bhakti",
      "ashrams",
      "yoga",
    ],
  },
  {
    id: "heritage",
    label: "Forts & heritage",
    tags: [
      "heritage",
      "history",
      "palaces",
      "forts",
      "architecture",
      "museums",
    ],
  },
  {
    id: "coast",
    label: "Beaches & coast",
    tags: ["beaches", "beach", "coastal"],
  },
  {
    id: "hills",
    label: "Hills & mountains",
    tags: [
      "hills",
      "mountains",
      "himalayas",
      "tea",
      "scenic",
      "nature",
      "lakes",
    ],
  },
  {
    id: "food",
    label: "Food & markets",
    tags: ["food", "shopping", "culture"],
  },
];

export type Theme = {
  id: string;
  label: string;
  destinations: Destination[];
};

export const themes: Theme[] = THEME_TAGS.map(({ id, label, tags }) => ({
  id,
  label,
  destinations: destinations.filter((d) =>
    d.tags.some((tag) => tags.includes(tag)),
  ),
})).filter((theme) => theme.destinations.length > 0);

/** Deterministic month names — `Intl` would vary with the server's locale. */
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** `byMonth[0]` is January. Every entry is sorted for a stable render. */
export const byMonth: Destination[][] = MONTHS.map((_, index) =>
  destinations
    .filter((d) => d.bestMonths.includes(index + 1))
    .sort((a, b) => a.name.localeCompare(b.name, "en")),
);

/**
 * Render a month set as its contiguous runs — "Oct – Mar", or "Feb – Apr · Sep – Nov"
 * for the several destinations with two separate good seasons. Collapsing those
 * to a single range would silently invent a wrong answer.
 */
export function monthRange(bestMonths: number[], abbreviated = false): string {
  const names = abbreviated ? MONTH_ABBR : MONTHS;
  const present = new Set(bestMonths);
  if (present.size === 0) return "Any time";
  if (present.size >= 12) return "Year-round";

  const previous = (m: number) => ((m + 10) % 12) + 1;
  const next = (m: number) => (m % 12) + 1;

  const runs: string[] = [];
  for (const month of [...present].sort((a, b) => a - b)) {
    if (present.has(previous(month))) continue; // not the head of a run
    let end = month;
    while (present.has(next(end)) && next(end) !== month) end = next(end);
    runs.push(
      end === month
        ? names[month - 1]
        : `${names[month - 1]} – ${names[end - 1]}`,
    );
  }

  return runs.join(" · ");
}

/** Derived from the corpus itself, so it cannot drift when sections change. */
export const CORPUS_SECTION_COUNT = destinations.reduce(
  (total, destination) => total + Object.keys(destination.sections).length,
  0,
);
