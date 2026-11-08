import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AVIF first: photos are about a third smaller than WebP.
  images: { formats: ["image/avif", "image/webp"] },
  cacheComponents: true,
  partialPrefetching: true,
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
