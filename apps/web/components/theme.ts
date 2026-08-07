export type ThemeMode = "dark" | "light";

export interface Theme {
  readonly bg: string;
  readonly panel: string;
  readonly panelDeep: string;
  readonly text: string;
  readonly mid: string;
  readonly midStrong: string;
  readonly line: string;
  readonly ticketBg: string;
  readonly ticketText: string;
  readonly ticketMid: string;
  readonly ticketLine: string;
  readonly payloadBg: string;
  readonly payloadText: string;
  /** Translucent glass fill for elevated cards, layered over `bg`. */
  readonly cardBg: string;
  /** Hairline border for glass cards, tuned per mode. */
  readonly cardBorder: string;
  /** Faint accent wash used for chips and highlighted surfaces. */
  readonly accentSoft: string;
  /** Radial glow color bloomed behind the hero and CTAs. */
  readonly glow: string;
}

/** Brand red and navy — fixed across both theme modes, sampled from the Advertek Agent mark. */
export const ACCENT = "#DD1E36";
export const NAVY = "#1B4388";

/** Solana brand gradient — reserved for on-chain / settlement moments only. */
export const SOLANA_START = "#9945FF";
export const SOLANA_END = "#14F195";
export const SOLANA_GRAD = `linear-gradient(100deg, ${SOLANA_START} 0%, #19FB9B 55%, ${SOLANA_END} 100%)`;

export const themes: Record<ThemeMode, Theme> = {
  dark: {
    bg: "#060910",
    panel: "#0B1220",
    panelDeep: "#04070D",
    text: "#EEF2F9",
    mid: "#93A1BC",
    midStrong: "#C3CEE2",
    line: "#1A2438",
    ticketBg: "#F4F7FC",
    ticketText: "#0B1220",
    ticketMid: "#5C6B85",
    ticketLine: "#DCE3EF",
    payloadBg: "#04070D",
    payloadText: "#E7ECF5",
    cardBg: "rgba(255,255,255,0.03)",
    cardBorder: "rgba(255,255,255,0.09)",
    accentSoft: "rgba(221,30,54,0.14)",
    glow: "rgba(221,30,54,0.28)",
  },
  light: {
    bg: "#FFFFFF",
    panel: "#F5F7FB",
    panelDeep: "#0B1220",
    text: "#0B1220",
    mid: "#55627A",
    midStrong: "#33455F",
    line: "#E2E8F2",
    ticketBg: "#FFFFFF",
    ticketText: "#0B1220",
    ticketMid: "#5C6B85",
    ticketLine: "#E2E8F2",
    payloadBg: "#0B1220",
    payloadText: "#EEF2F9",
    cardBg: "rgba(11,18,32,0.02)",
    cardBorder: "rgba(11,18,32,0.10)",
    accentSoft: "rgba(221,30,54,0.08)",
    glow: "rgba(221,30,54,0.12)",
  },
};
