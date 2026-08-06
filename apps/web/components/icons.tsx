import { ACCENT, NAVY } from "./theme";

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

/** Registration mark — kept in brand red, the way a print shop's registration mark is traditionally struck in red ink. */
export function RegMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="9" stroke={ACCENT} strokeWidth="1" />
      <line x1="13" y1="1" x2="13" y2="25" stroke={ACCENT} strokeWidth="1" />
      <line x1="1" y1="13" x2="25" y2="13" stroke={ACCENT} strokeWidth="1" />
    </svg>
  );
}

interface AdvertekMarkProps {
  readonly size?: number;
}

/** The Advertek Agent mark, simplified: a red sliver and a navy chevron forming the "A", the way it reads in the source logo. */
export function AdvertekMark({ size = 28 }: AdvertekMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <polygon points="38,86 50,14 58,14 46,86" fill={ACCENT} />
      <polygon points="50,14 86,86 68,86 50,48 32,86 22,86" fill={NAVY} />
    </svg>
  );
}
