"use client";

import type { AnalyticsEvent } from "./site-config";

type Gtag = (...args: unknown[]) => void;

interface AnalyticsWindow extends Window {
  gtag?: Gtag;
}

function getGtag(): Gtag | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as AnalyticsWindow).gtag;
}

export interface TrackProps {
  readonly page?: string;
  readonly source?: string;
  readonly useCase?: string;
  readonly environment?: string;
  readonly status?: string;
  readonly errorCategory?: string;
  readonly cta?: string;
  readonly route?: string;
  readonly example?: string;
  readonly language?: string;
  readonly categoryCount?: number;
}

export function track(event: AnalyticsEvent, props?: TrackProps): void {
  const gtag = getGtag();
  if (!gtag) return;
  try {
    gtag("event", event, props ?? {});
  } catch {
    // Analytics must never break application flow.
  }
}

export function trackLink(
  event: AnalyticsEvent,
  href: string,
  props?: Omit<TrackProps, "source">,
): () => void {
  return () => { track(event, { source: href, ...props }); };
}
