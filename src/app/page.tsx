import { connection } from "next/server";
import { destinations } from "@/data/destinations";
import { getCorpusStatus } from "@/lib/corpus-status";
import BrandBar from "./_components/BrandBar";
import { ChatPrefillProvider } from "./_components/chat-prefill";
import Hero from "./_components/Hero";
import HowItWorks from "./_components/HowItWorks";
import RecommendedGrid from "./_components/RecommendedGrid";
import ScrollEffects from "./_components/ScrollEffects";
import SiteFooter from "./_components/SiteFooter";
import ThemeBrowse from "./_components/ThemeBrowse";
import WhenToGo from "./_components/WhenToGo";

export default async function Home() {
  // Neither the chunk count nor today's date may be baked in at build time, and
  // neither is a request-time API that Next would notice on its own — without
  // this the page prerenders and the corpus stats and month strip go stale.
  await connection();

  // Read on the server: the page must not claim to be grounded while the index
  // is empty, and the month strip cannot read the clock on the client without
  // risking a hydration mismatch.
  const corpus = await getCorpusStatus();
  const currentMonth = new Date().getMonth() + 1;

  return (
    <ChatPrefillProvider>
      <a
        href="#destinations"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to destinations
      </a>

      <BrandBar
        tagline={`${destinations.length} destinations · answers cite their sources`}
      />

      <main id="top" className="flex flex-1 flex-col">
        <Hero corpus={corpus} destinationCount={destinations.length} />
        <RecommendedGrid />
        <ThemeBrowse />
        <WhenToGo initialMonth={currentMonth} />
        <HowItWorks />
      </main>

      <SiteFooter />
      <ScrollEffects />
    </ChatPrefillProvider>
  );
}
