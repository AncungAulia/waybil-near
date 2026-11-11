import type { NextConfig } from "next";

const API_URL = (process.env.API_URL || "https://api.waybil.xyz").replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  /*
   * The browser only ever calls /api/*. Server-to-server requests carry no Origin, so the
   * backend's CORS list doesn't apply, and localhost works the same as production.
   */
  rewrites: async () => [
    { source: "/api/health", destination: `${API_URL}/health` },
    { source: "/api/:path*", destination: `${API_URL}/v1/:path*` },
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
