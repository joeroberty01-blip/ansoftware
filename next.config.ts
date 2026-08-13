import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal, self-contained production build (only what's needed at
  // runtime) — makes Docker/VPS deployment straightforward. Vercel has its
  // own equivalent packaging step and its build breaks if this is set
  // (ENOENT on .next/next-server.js.nft.json), so skip it there —
  // Vercel sets the VERCEL env var during build.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
