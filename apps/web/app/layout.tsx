import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Big_Shoulders, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: false,
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const description =
  "Advertek Agent Rail — the fulfillment rail behind advertekprinting.com. Machine-readable print orders, priced in CAD and settled in USDC over Solana.";

export const metadata: Metadata = {
  title: "Advertek Agent Rail — print jobs agents can order, pay for, and track",
  description,
  openGraph: {
    title: "Advertek Agent Rail",
    description,
    siteName: "Advertek Agent Rail",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Advertek Agent Rail",
    description,
  },
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
