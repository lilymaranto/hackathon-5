import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Directory that contains this config file (the app root), not inferred from unrelated lockfiles. */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    // Avoid picking e.g. ~/package-lock.json as the workspace root (watches too much, huge memory).
    root: appRoot,
  },
};

export default nextConfig;
