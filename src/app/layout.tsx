import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

/**
 * Display face: Fraunces, a soft old-style serif. Distinctive without being
 * decorative — it carries the editorial voice the previous Playfair setting did,
 * but is far less ubiquitous.
 *
 * Body face: Instrument Sans. The previous body font was Source Serif 4, and a
 * conventional text serif at 15-16px is what made the page read like a printed
 * document. A slightly condensed sans keeps long answers legible on screen.
 *
 * Both are variable fonts, so `weight` is deliberately omitted: next/font ships
 * the single variable file and every weight used in the UI comes from it.
 */
const fraunces = Fraunces({
  variable: "--font-display-family",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-body-family",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Rootwise · Travel across India, answered from real guides",
    template: "%s · Rootwise",
  },
  description:
    "Ask about twenty destinations across India and get answers written from hand-written destination guides — every answer shows the passages behind it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
