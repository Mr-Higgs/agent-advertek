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
}

/** Brand red and navy — fixed across both theme modes, sampled from the Advertek Agent mark. */
export const ACCENT = "#DD1E36";
export const NAVY = "#1B4388";

export const themes: Record<ThemeMode, Theme> = {
  dark: {
    bg: "#0B1626",
    panel: "#10203A",
    panelDeep: "#060D18",
    text: "#F2F5FA",
    mid: "#8CA0C0",
    midStrong: "#B7C6DE",
    line: "#1F3352",
    ticketBg: "#F2F5FA",
    ticketText: "#10233F",
    ticketMid: "#5C6B85",
    ticketLine: "#D7DEEA",
    payloadBg: "#060D18",
    payloadText: "#F2F5FA",
  },
  light: {
    bg: "#FFFFFF",
    panel: "#F2F5FA",
    panelDeep: "#10233F",
    text: "#10233F",
    mid: "#5C6B85",
    midStrong: "#33455F",
    line: "#D7DEEA",
    ticketBg: "#FFFFFF",
    ticketText: "#10233F",
    ticketMid: "#5C6B85",
    ticketLine: "#D7DEEA",
    payloadBg: "#10233F",
    payloadText: "#F2F5FA",
  },
};
