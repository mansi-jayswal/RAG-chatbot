import { destinations } from "@/data/destinations";
import { recommended } from "@/lib/catalog";
import DestinationCard from "./DestinationCard";
import DestinationChips from "./DestinationChips";
import SectionHeading from "./SectionHeading";

export default function RecommendedGrid() {
  return (
    <section
      id="destinations"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24"
    >
      <SectionHeading
        eyebrow="Where to go"
        title="Six places to start"
        lede="Chosen to span what the guides cover — a river city, two Rajasthani capitals, a coastline, tea country and the eastern Himalaya. Open any card to read the full guide."
      />

      <ul
        className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        data-card-grid
      >
        {recommended.map((destination) => (
          <li key={destination.slug} className="h-full" data-card-item>
            <DestinationCard destination={destination} />
          </li>
        ))}
      </ul>

      <div
        className="mt-12 rounded-2xl border border-border bg-card/60 p-5 sm:p-6"
        data-reveal
      >
        <h3 className="text-sm font-semibold">
          All {destinations.length} destinations we cover
        </h3>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Everything Rootwise can answer about. Open one to read its guide.
        </p>
        <DestinationChips destinations={destinations} />
      </div>
    </section>
  );
}
