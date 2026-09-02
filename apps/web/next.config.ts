import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@advertek/catalog",
    "@advertek/db",
    "@advertek/fulfillment",
    "@advertek/mcp-server",
    "@advertek/payments",
    "@advertek/quote-api",
    "@advertek/types",
    "@advertek/webhooks",
  ],
  async redirects() {
    return [
      { source: "/rail", destination: "/platform", permanent: true },
    ];
  },
};

export default nextConfig;
