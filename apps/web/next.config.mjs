import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@bugbot/shared'],
  // ESLint runs from the workspace root (`pnpm lint`, flat config); the build should not lint twice.
  eslint: { ignoreDuringBuilds: true },
  // Docker image: a self-contained server.js with only the traced dependencies. The trace step
  // creates symlinks, which Windows refuses without Developer Mode — and the image is built on
  // Linux anyway (Dockerfile, CI), so a local Windows `next build` skips it.
  output: process.platform === 'win32' ? undefined : 'standalone',
  // Without this Next traces from apps/web and misses the workspace's hoisted node_modules.
  outputFileTracingRoot: path.join(dirname, '../../'),
  async rewrites() {
    // Same-origin proxy so browser calls to /api/* hit the NestJS API (cookies, no CORS).
    // SSR fetches talk to the API directly (see src/lib/api.ts). 3101 is the dev host port.
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3101'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
