"use client";

import type { UIMessage } from "ai";
import type {
  CatalogToolResult,
  CreateOrderToolResult,
  QuoteToolResult,
  SkuQuoteToolResult,
} from "@advertek/mcp-server";
import { themes } from "../theme";
import {
  CatalogCard,
  OrderStatusCard,
  PaymentRequestCard,
  QuoteCard,
  SkuQuoteCard,
  type OrderStatusResult,
} from "./tool-cards";

const t = themes.light;

const PENDING_LABELS: Record<string, string> = {
  "tool-get_catalog": "Opening the catalog",
  "tool-get_quote": "Pricing the job",
  "tool-get_sku_quote": "Pricing the product",
  "tool-create_order": "Placing the order",
  "tool-get_order_status": "Checking the order",
};

function PendingLine({ label }: { readonly label: string }) {
  return (
    <div
      className="font-mono text-[11px] uppercase tracking-widest flex items-center gap-2 my-3"
      style={{ color: t.mid }}
    >
      {label}
      <span aria-hidden="true">
        <span className="think-dot">·</span>
        <span className="think-dot">·</span>
        <span className="think-dot">·</span>
      </span>
    </div>
  );
}

function FailureLine({ message }: { readonly message: string | undefined }) {
  return (
    <div
      className="font-mono text-[11px] uppercase tracking-widest border-l pl-3 my-3"
      style={{ color: t.mid, borderColor: t.line }}
    >
      {message ?? "That didn't work — adjusting"}
    </div>
  );
}

interface ToolFailureShape {
  readonly ok?: boolean;
  readonly error?: { readonly message?: string } | string;
}

function failureMessage(output: unknown): string | undefined {
  const shape = output as ToolFailureShape;
  if (typeof shape.error === "string") return shape.error;
  return shape.error?.message;
}

function ToolPart({
  type,
  state,
  output,
}: {
  readonly type: string;
  readonly state: string;
  readonly output: unknown;
}) {
  if (state === "input-streaming" || state === "input-available") {
    return <PendingLine label={PENDING_LABELS[type] ?? "Working"} />;
  }
  if (state === "output-error") {
    return <FailureLine message={undefined} />;
  }
  if (state !== "output-available") {
    return null;
  }
  if ((output as ToolFailureShape).ok === false) {
    return <FailureLine message={failureMessage(output)} />;
  }
  switch (type) {
    case "tool-get_catalog":
      return <CatalogCard result={output as CatalogToolResult & { demoPricing?: boolean }} />;
    case "tool-get_quote":
      return <QuoteCard result={output as QuoteToolResult & { demoPricing?: boolean }} />;
    case "tool-get_sku_quote":
      return <SkuQuoteCard result={output as SkuQuoteToolResult & { demoPricing?: boolean }} />;
    case "tool-create_order":
      return <PaymentRequestCard result={output as CreateOrderToolResult} />;
    case "tool-get_order_status":
      return <OrderStatusCard result={output as OrderStatusResult} />;
    default:
      return null;
  }
}

/** One chat turn, rendered like a transcript entry: mono eyebrow, then parts. */
export function MessageParts({ message }: { readonly message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className="msg-in py-5 border-b" style={{ borderColor: t.line }}>
      <div
        className="font-mono text-[10px] uppercase tracking-[0.25em] mb-2"
        style={{ color: isUser ? t.mid : t.text }}
      >
        {isUser ? "You" : "Advertek"}
      </div>
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <p
              key={`${message.id}-${String(index)}`}
              className="text-[15px] leading-relaxed whitespace-pre-wrap mb-2 last:mb-0"
              style={{ color: t.text }}
            >
              {part.text}
            </p>
          );
        }
        if (part.type.startsWith("tool-") && "state" in part) {
          return (
            <ToolPart
              key={`${message.id}-${String(index)}`}
              type={part.type}
              state={part.state}
              output={"output" in part ? part.output : undefined}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
