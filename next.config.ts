import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Destination photography is hotlinked from Unsplash rather than committed
    // to `public/` — see `src/data/destinations.ts` for the per-photo credits.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
