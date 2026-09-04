"use client";

import type { MockupToolResult } from "@/lib/chat-tools";
import { themes } from "../theme";
import { Ticket } from "./tool-cards";

const t = themes.light;

/**
 * Live CSS/SVG product mockups — the uploaded artwork composited into a
 * stylized product frame per category. Deliberately illustrative, not
 * photoreal: four bespoke frames (canvas wrap, framed print, mug, tee) and
 * a generic flat face for the rest.
 */

const ASPECTS: Record<string, string> = {
  vertical: "3 / 4",
  horizontal: "4 / 3",
  square: "1 / 1",
};

function Art({
  url,
  orientation,
  className,
  style,
}: {
  readonly url: string;
  readonly orientation: string;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}) {
  return (
    <img
      src={url}
      alt="Uploaded artwork on the product"
      className={className ?? "block w-full h-full object-cover"}
      style={{ aspectRatio: ASPECTS[orientation] ?? "1 / 1", ...style }}
    />
  );
}

function GalleryWrap({ url, orientation }: { readonly url: string; readonly orientation: string }) {
  const edge = 12;
  return (
    <div className="relative inline-block max-w-[280px] my-2 mr-4" style={{ filter: "drop-shadow(16px 16px 20px rgba(0,0,0,0.25))" }}>
      <Art url={url} orientation={orientation} className="block w-full object-cover" />
      <div
        className="absolute top-0 h-full"
        style={{
          right: -edge,
          width: edge,
          backgroundImage: `url(${url})`,
          backgroundSize: "cover",
          filter: "brightness(0.55)",
          transform: "skewY(45deg)",
          transformOrigin: "top left",
        }}
      />
      <div
        className="absolute left-0 w-full"
        style={{
          bottom: -edge,
          height: edge,
          backgroundImage: `url(${url})`,
          backgroundSize: "cover",
          filter: "brightness(0.7)",
          transform: "skewX(45deg)",
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}

function Framed({
  url,
  orientation,
  mat,
}: {
  readonly url: string;
  readonly orientation: string;
  readonly mat: number;
}) {
  return (
    <div
      className="inline-block max-w-[280px] my-2"
      style={{
        border: `10px solid ${t.text}`,
        padding: mat,
        backgroundColor: "#FFFFFF",
        boxShadow: "10px 12px 22px rgba(0,0,0,0.2)",
      }}
    >
      <Art url={url} orientation={orientation} className="block w-full object-cover" />
    </div>
  );
}

function Mug({ url }: { readonly url: string }) {
  return (
    <div className="relative inline-block my-2 mr-6">
      <div
        className="relative overflow-hidden"
        style={{
          width: 190,
          height: 150,
          backgroundColor: "#FFFFFF",
          border: `1px solid ${t.line}`,
          borderRadius: "6px 6px 16px 16px",
          boxShadow: "8px 10px 18px rgba(0,0,0,0.15)",
        }}
      >
        <div className="absolute inset-x-0" style={{ top: 24, bottom: 24 }}>
          <Art url={url} orientation="horizontal" style={{ aspectRatio: "auto" }} />
        </div>
      </div>
      <div
        className="absolute"
        style={{
          right: -26,
          top: 34,
          width: 44,
          height: 72,
          border: `10px solid ${t.line}`,
          borderLeft: "none",
          borderRadius: "0 24px 24px 0",
        }}
      />
    </div>
  );
}

function Tee({ url, orientation }: { readonly url: string; readonly orientation: string }) {
  const chest =
    orientation === "horizontal"
      ? { x: 58, y: 92, width: 84, height: 63 }
      : { x: 66, y: 84, width: 68, height: 90 };
  return (
    <svg viewBox="0 0 200 220" className="block max-w-[280px] my-2" role="img" aria-label="T-shirt mockup">
      <defs>
        <clipPath id="tee-chest">
          <rect {...chest} />
        </clipPath>
      </defs>
      <path
        d="M62 22 C76 40 124 40 138 22 L186 52 L162 94 L142 80 L142 212 L58 212 L58 80 L38 94 L14 52 Z"
        fill="#F7F7F5"
        stroke={t.line}
        strokeWidth="1.5"
      />
      <path d="M62 22 C76 40 124 40 138 22" fill="none" stroke={t.line} strokeWidth="1.5" />
      <image
        href={url}
        {...chest}
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#tee-chest)"
      />
    </svg>
  );
}

function FlatFace({
  url,
  orientation,
  grid,
}: {
  readonly url: string;
  readonly orientation: string;
  readonly grid: boolean;
}) {
  return (
    <div
      className="relative inline-block max-w-[280px] my-2"
      style={{ border: `1px solid ${t.line}`, boxShadow: "8px 10px 18px rgba(0,0,0,0.12)" }}
    >
      <Art url={url} orientation={orientation} className="block w-full object-cover" />
      {grid ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.55) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgba(255,255,255,0.55) 0 1px, transparent 1px 28px)",
          }}
        />
      ) : null}
    </div>
  );
}

export function MockupCard({ result }: { readonly result: MockupToolResult }) {
  if (!result.ok || result.sku === undefined || result.artworkUrl === undefined) return null;
  const orientation = result.orientation ?? "square";
  const url = result.artworkUrl;
  const category = result.category ?? "";

  let face: React.ReactNode;
  switch (category) {
    case "canvas-gallery-wrap":
      face = <GalleryWrap url={url} orientation={orientation} />;
      break;
    case "canvas-framed":
      face = <Framed url={url} orientation={orientation} mat={6} />;
      break;
    case "framed-prints":
      face = <Framed url={url} orientation={orientation} mat={22} />;
      break;
    case "mugs":
      face = <Mug url={url} />;
      break;
    case "t-shirts":
      face = <Tee url={url} orientation={orientation} />;
      break;
    default:
      face = <FlatFace url={url} orientation={orientation} grid={category === "puzzles"} />;
  }

  return (
    <Ticket label={`Mockup — ${result.name ?? result.sku}`}>
      <div className="flex justify-center py-3">{face}</div>
      <div className="font-mono text-[11px] uppercase tracking-wider" style={{ color: t.ticketMid }}>
        {result.sku}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-wider mt-3" style={{ color: t.ticketMid }}>
        Demo mockup — CSS preview, not a production proof
      </p>
    </Ticket>
  );
}
