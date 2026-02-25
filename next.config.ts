import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
  // Ensure Turbopack selects this project as the root even if other lockfiles exist above.
  turbopack: {
    root: __dirname,
  },
} satisfies NextConfig;

export default nextConfig;
