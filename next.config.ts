import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lean production image: emits .next/standalone with a minimal server + only
  // the traced node_modules. See Dockerfile.
  output: "standalone",
  /*
   * Pin the file-tracing root to this project.
   *
   * Next infers the root by walking up for a lockfile, and an unrelated
   * pnpm-lock.yaml further up the tree (a stray one in $HOME, or a parent
   * workspace) wins that search. It then traces `output: "standalone"` against
   * the wrong directory, which silently produces an image missing runtime
   * dependencies — a failure that only shows up on boot in the container.
   */
  outputFileTracingRoot: path.join(__dirname),
  // Prisma & other server-only packages must not be bundled into RSC output.
  serverExternalPackages: ["@prisma/client", "argon2", "ioredis", "bullmq", "sharp", "@aws-sdk/client-s3"],
  experimental: {
    // Re-enabled in Increment 2 once /login, /signup, /explore exist. Enabling
    // it now would force fake placeholder routes just to satisfy the type check,
    // which violates the "no placeholder pages" rule.
    typedRoutes: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Security headers applied to every response (clickjacking, sniffing, referrer).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
