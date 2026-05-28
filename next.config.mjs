import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep libsql's native module (used by file: URLs in dev) out of the bundle.
  serverExternalPackages: ["@libsql/client", "libsql"],
  outputFileTracingRoot: __dirname,
  experimental: {},
};

export default nextConfig;
