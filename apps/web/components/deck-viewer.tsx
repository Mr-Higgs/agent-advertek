"use client";

import { useState } from "react";
import { ACCENT, type Theme } from "./theme";
import { CropMark } from "./icons";
import { deckSlides } from "./deck-slides";

interface DeckViewerProps {
  readonly theme: Theme;
}

export function DeckViewer({ theme: t }: DeckViewerProps) {
  const [i, setI] = useState(0);
  const total = deckSlides.length;
  const current = deckSlides[i];

  function go(next: number): void {
    setI(Math.max(0, Math.min(total - 1, next)));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "ArrowLeft") go(i - 1);
    if (event.key === "ArrowRight") go(i + 1);
  }

  if (!current) {
    return null;
  }

  return (
    <div>
      <div
        className="relative w-full"
        style={{
          backgroundColor: t.payloadBg,
          border: `1px solid ${t.line}`,
          aspectRatio: "16 / 9",
        }}
        tabIndex={0}
        role="group"
        aria-roledescription="slide viewer"
        aria-label="Advertek Agent Rail pitch deck"
        onKeyDown={onKeyDown}
      >
        <CropMark className="absolute -top-1 -left-1" stroke={ACCENT} />
        <CropMark className="absolute -top-1 -right-1" stroke={ACCENT} />
        <CropMark className="absolute -bottom-1 -left-1" stroke={ACCENT} />
        <CropMark className="absolute -bottom-1 -right-1" stroke={ACCENT} />
        {deckSlides.map((slide, idx) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              opacity: idx === i ? 1 : 0,
              transition: "opacity 0.25s ease",
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              go(i - 1);
            }}
            disabled={i === 0}
            aria-label="Previous slide"
            className="font-mono text-xs tracking-widest uppercase px-5 py-2.5"
            style={{
              border: `1px solid ${i === 0 ? t.line : ACCENT}`,
              color: i === 0 ? t.mid : t.text,
              opacity: i === 0 ? 0.4 : 1,
            }}
          >
            &larr; Prev
          </button>
          <button
            type="button"
            onClick={() => {
              go(i + 1);
            }}
            disabled={i === total - 1}
            aria-label="Next slide"
            className="font-mono text-xs tracking-widest uppercase px-5 py-2.5"
            style={{
              border: `1px solid ${i === total - 1 ? t.line : ACCENT}`,
              color: i === total - 1 ? t.mid : t.text,
              opacity: i === total - 1 ? 0.4 : 1,
            }}
          >
            Next &rarr;
          </button>
        </div>
        <div className="font-mono text-xs tracking-widest" style={{ color: t.mid }}>
          {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
        <a
          href={current.src}
          download={`advertek-agent-rail-slide-${String(i + 1)}.jpg`}
          className="font-mono text-xs tracking-widest uppercase underline"
          style={{ color: ACCENT, textUnderlineOffset: "3px" }}
        >
          Download this slide
        </a>
      </div>

      <div className="flex gap-2 mt-5 overflow-x-auto pb-1">
        {deckSlides.map((slide, idx) => (
          <button
            type="button"
            key={slide.src}
            onClick={() => {
              go(idx);
            }}
            aria-label={`Go to ${slide.alt}`}
            className="flex-shrink-0"
            style={{
              width: "72px",
              aspectRatio: "16/9",
              padding: 0,
              border: `2px solid ${idx === i ? ACCENT : "transparent"}`,
              opacity: idx === i ? 1 : 0.5,
              backgroundColor: t.payloadBg,
            }}
          >
            <img src={slide.src} alt="" className="w-full h-full object-cover" style={{ display: "block" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
