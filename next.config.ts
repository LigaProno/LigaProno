import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/world-cup/api-sports",
        destination: "/matches",
        permanent: false,
      },
      {
        source: "/world-cup/fifa",
        destination: "/matches",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "crests.football-data.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
