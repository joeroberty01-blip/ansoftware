import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal, self-contained production build (only what's needed at
  // runtime) — makes Docker/VPS deployment straightforward.
  output: "standalone",
};

export default nextConfig;
