import type { Metadata } from "next";
import AdvertekAgent from "@/components/advertek-agent";

const title = "Advertek Agent Rail — print jobs agents can order, pay for, and track";
const description =
  "Advertek Agent Rail — the fulfillment rail behind advertekprinting.com. Machine-readable print orders, priced in CAD and settled in USDC over Solana.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "Advertek Agent Rail",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RailPage() {
  return <AdvertekAgent />;
}
