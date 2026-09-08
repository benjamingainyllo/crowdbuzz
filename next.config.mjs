/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  /**
   * Make the browser ASK before reusing a page.
   *
   * With no rule here, a phone can hold an HTML document across a deploy and
   * keep showing yesterday's site with nothing visibly wrong — which is
   * exactly what happened, twice, and cost more time than any bug this week.
   * It matters more for buyers than for us: an organiser who moves their
   * doors from 9 to 10 needs the next person opening that link to see 10.
   *
   * This is must-revalidate, NOT no-store. The browser still keeps the copy;
   * it just checks whether it is still good, and the answer is usually an
   * empty 304. Hashed assets under /_next/static are excluded because their
   * filenames change when their contents do, so they stay immutable and the
   * page still loads fast.
   */
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|version).*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
