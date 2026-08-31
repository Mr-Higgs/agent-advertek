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
  /** Translucent fill for elevated cards, layered over `bg`. */
  readonly cardBg: string;
  /** Hairline border for cards, tuned per mode. */
  readonly cardBorder: string;
  /** Faint ink wash used for chips and highlighted surfaces. */
  readonly accentSoft: string;
  /** Legacy glow slot — transparent in the mono system, kept so shadows collapse quietly. */
  readonly glow: string;
  /** Solid ink: buttons, emphasis. Black on paper, white on ink. */
  readonly accent: string;
  /** Text/foreground set against `accent`. */
  readonly accentContrast: string;
}

/**
 * Mono identity: the site is ink on paper. Both constants resolve to ink so
 * the mark and registration glyphs print solid black (inverted on dark).
 */
export const ACCENT = "#0A0A0A";
export const NAVY = "#0A0A0A";

/** On-chain / settlement moments: struck as quiet gray, no longer a brand gradient. */
export const SOLANA_START = "#666666";
export const SOLANA_END = "#999999";
export const SOLANA_GRAD = `linear-gradient(100deg, ${SOLANA_START} 0%, #7F7F7F 55%, ${SOLANA_END} 100%)`;

export const themes: Record<ThemeMode, Theme> = {
  light: {
    bg: "#FFFFFF",
    panel: "#FAFAFA",
    panelDeep: "#0A0A0A",
    text: "#0A0A0A",
    mid: "#6B6B6B",
    midStrong: "#3D3D3D",
    line: "#E5E5E5",
    ticketBg: "#FFFFFF",
    ticketText: "#0A0A0A",
    ticketMid: "#6B6B6B",
    ticketLine: "#E5E5E5",
    payloadBg: "#0A0A0A",
    payloadText: "#F2F2F2",
    cardBg: "rgba(0,0,0,0.02)",
    cardBorder: "rgba(0,0,0,0.12)",
    accentSoft: "rgba(0,0,0,0.05)",
    glow: "transparent",
    accent: "#000000",
    accentContrast: "#FFFFFF",
  },
  dark: {
    bg: "#0A0A0A",
    panel: "#141414",
    panelDeep: "#000000",
    text: "#F2F2F2",
    mid: "#8C8C8C",
    midStrong: "#C4C4C4",
    line: "#262626",
    ticketBg: "#F5F5F3",
    ticketText: "#0A0A0A",
    ticketMid: "#6B6B6B",
    ticketLine: "#DDDDDA",
    payloadBg: "#000000",
    payloadText: "#EDEDEB",
    cardBg: "rgba(255,255,255,0.03)",
    cardBorder: "rgba(255,255,255,0.14)",
    accentSoft: "rgba(255,255,255,0.06)",
    glow: "transparent",
    accent: "#FFFFFF",
    accentContrast: "#0A0A0A",
  },
};
