import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Advertek Agent Rail",
  description:
    "Advertek Agent Rail — the fulfillment rail behind advertekprinting.com. Machine-readable print orders, paid in USDC over Solana.",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
