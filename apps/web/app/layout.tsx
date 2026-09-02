import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { GlobalHeader } from "@/components/site/header";
import { GlobalFooter } from "@/components/site";
import { createMetadata } from "@/lib/site-config";

const display = Archivo({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-display",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
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

export const metadata: Metadata = createMetadata("home");

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${serif.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="flex flex-col min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-ink focus:text-paper focus:px-4 focus:py-2"
        >
          Skip to main content
        </a>
        <GlobalHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <GlobalFooter />
      </body>
    </html>
  );
}
