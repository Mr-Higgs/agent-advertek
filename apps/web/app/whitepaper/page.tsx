import type { Metadata } from "next";
import Whitepaper from "@/components/whitepaper";

const description =
  "Technical whitepaper for Advertek Agent Rail — the MCP server and REST API that lets AI agents quote, pay in USDC on Solana, and fulfill print production with no human in the loop.";

export const metadata: Metadata = {
  title: "Whitepaper — Advertek Agent Rail",
  description,
  openGraph: {
    title: "Advertek Agent Rail — Whitepaper",
    description,
    siteName: "Advertek Agent Rail",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Advertek Agent Rail — Whitepaper",
    description,
  },
};

export default function WhitepaperPage() {
  return <Whitepaper />;
}
