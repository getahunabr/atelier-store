import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root: a stray lockfile in a parent directory otherwise makes Next guess wrong.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
};

export default nextConfig;
