import { destinations } from "@/data/destinations";
import { CORPUS_SECTION_COUNT, recommended } from "@/lib/catalog";
import BrandMark from "./BrandMark";

const SECTION_LINKS = [
  { href: "#plan", label: "Plan a trip" },
  { href: "#destinations", label: "Destinations" },
  { href: "#how-it-works", label: "How it works" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="flex items-center gap-2.5">
              <BrandMark className="size-7 text-marigold" />
              <span className="font-display text-lg font-semibold tracking-tight">
                Rootwise
              </span>
            </p>
            <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
              A retrieval-grounded travel assistant over {destinations.length}{" "}
              hand-written destination guides — {CORPUS_SECTION_COUNT} indexed
              passages in all. Every answer shows the ones behind it.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="text-xs font-semibold tracking-[0.14em] uppercase">
              This page
            </h2>
            <ul className="mt-4 space-y-2.5">
              {SECTION_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-semibold tracking-[0.14em] uppercase">
              Featured
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {recommended.map((destination) => (
                <li key={destination.slug}>{destination.name}</li>
              ))}
              <li>
                <a
                  href="#destinations"
                  className="text-foreground underline underline-offset-4 transition-colors hover:text-marigold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  All {destinations.length} destinations
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs leading-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Conversations live in memory only — a refresh clears them. Nothing
            is stored, by design.
          </p>
          <p>
            Photography from{" "}
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Unsplash
            </a>
            , under the Unsplash License.
          </p>
        </div>
      </div>
    </footer>
  );
}
