import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Library was merged into Sermons; keep old links and bookmarks working (query strings pass through).
  redirects: async () => [{ source: "/library", destination: "/sermons", permanent: true }],
};

export default nextConfig;
