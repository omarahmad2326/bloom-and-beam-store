/** @type {import('next').NextConfig} */
const env = (name) => process.env[`NEXT_PUBLIC_${name}`] || process.env[`VITE_${name}`] || '';

const nextConfig = {
  reactStrictMode: true,
  // Deploys build into a separate folder and swap it in, so the running site never serves a half-built .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  // Do not write AGENTS.md into the repo on `next dev`.
  agentRules: false,
  // The server's .env still uses the VITE_ names; expose them under the Next.js names.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: env('SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env('SUPABASE_PUBLISHABLE_KEY'),
    NEXT_PUBLIC_SITE_URL: env('SITE_URL') || 'https://mrbedmed.com',
  },
  async redirects() {
    return [
      // Old gallery URLs → category pages (301, as search engines expect for moved pages).
      { source: '/gallery/:slug', destination: '/category/:slug', statusCode: 301 },
    ];
  },
};

export default nextConfig;
