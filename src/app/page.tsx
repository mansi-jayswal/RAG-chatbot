import type { Metadata } from "next";
import Chat from "./_components/Chat";

export const metadata: Metadata = {
  title: "Rootwise",
  description:
    "Ask about a destination and get an itinerary grounded in a retrieved corpus of destination write-ups.",
};

export default function Home() {
  return (
    <main className="flex min-h-0 flex-1 flex-col font-sans">
      <Chat />
    </main>
  );
}
