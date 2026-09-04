import { ACCENT } from "./theme";

interface CropMarkProps {
  readonly className?: string;
  readonly stroke: string;
}

export function CropMark({ className, stroke }: CropMarkProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <line x1="9" y1="0" x2="9" y2="6" stroke={stroke} strokeWidth="1" />
      <line x1="9" y1="12" x2="9" y2="18" stroke={stroke} strokeWidth="1" />
      <line x1="0" y1="9" x2="6" y2="9" stroke={stroke} strokeWidth="1" />
      <line x1="12" y1="9" x2="18" y2="9" stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

/** Registration mark — struck in solid ink, the way the mono identity prints every glyph. */
export function RegMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="9" stroke={ACCENT} strokeWidth="1" />
      <line x1="13" y1="1" x2="13" y2="25" stroke={ACCENT} strokeWidth="1" />
      <line x1="1" y1="13" x2="25" y2="13" stroke={ACCENT} strokeWidth="1" />
    </svg>
  );
}
