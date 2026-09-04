"use client";

import type { UIMessage } from "ai";
import type {
  CatalogToolResult,
  CreateOrderToolResult,
  QuoteToolResult,
  SkuQuoteToolResult,
} from "@advertek/mcp-server";
import type { MockupToolResult } from "@/lib/chat-tools";
import { themes } from "../theme";
import { MockupCard } from "./mockup-card";
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
  "tool-render_mockup": "Preparing the preview",
  "tool-create_order": "Placing the order",
  "tool-get_order_status": "Checking the order",
};

const MAX_INPUT_PREVIEW = 160;

function PendingLine({ label, input }: { readonly label: string; readonly input?: string }) {
  return (
    <div className="my-3">
      <div
        className="font-mono text-[11px] uppercase tracking-widest flex items-center gap-2"
        style={{ color: t.mid }}
      >
        {label}
        <span aria-hidden="true">
          <span className="think-dot">·</span>
          <span className="think-dot">·</span>
          <span className="think-dot">·</span>
        </span>
      </div>
      {input !== undefined ? (
        <div className="font-mono text-[10px] break-all mt-1" style={{ color: t.mid }}>
          {input}
        </div>
      ) : null}
    </div>
  );
}

/** The agent's streamed reasoning, shown quiet — the "agentic magic" layer. */
function ReasoningPart({ text }: { readonly text: string }) {
  return (
    <div className="border-l pl-3 my-3" style={{ borderColor: t.line }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: t.mid }}>
        Thinking
      </div>
      <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: t.mid }}>
        {text}
      </p>
    </div>
  );
}

function toolInputPreview(type: string, input: unknown): string | undefined {
  if (input === undefined) return undefined;
  try {
    const rendered = `${type.replace("tool-", "")} ${JSON.stringify(input)}`;
    return rendered.length > MAX_INPUT_PREVIEW ? `${rendered.slice(0, MAX_INPUT_PREVIEW)}…` : rendered;
  } catch {
    return undefined;
  }
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
  input,
  output,
}: {
  readonly type: string;
  readonly state: string;
  readonly input: unknown;
  readonly output: unknown;
}) {
  if (state === "input-streaming" || state === "input-available") {
    const preview = toolInputPreview(type, input);
    return (
      <PendingLine
        label={PENDING_LABELS[type] ?? "Working"}
        {...(preview !== undefined ? { input: preview } : {})}
      />
    );
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
    case "tool-render_mockup":
      return <MockupCard result={output as MockupToolResult} />;
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
        const key = `${message.id}-${String(index)}`;
        if (part.type === "text") {
          return (
            <p
              key={key}
              className="text-[15px] leading-relaxed whitespace-pre-wrap mb-2 last:mb-0"
              style={{ color: t.text }}
            >
              {part.text}
            </p>
          );
        }
        if (part.type === "reasoning") {
          return part.text.trim().length === 0 ? null : <ReasoningPart key={key} text={part.text} />;
        }
        if (part.type === "file") {
          return part.mediaType.startsWith("image/") ? (
            <img
              key={key}
              src={part.url}
              alt={part.filename ?? "Attached artwork"}
              className="block max-h-40 border my-2"
              style={{ borderColor: t.line }}
            />
          ) : (
            <span
              key={key}
              className="inline-block font-mono text-[10px] uppercase tracking-wider border px-2 py-1 my-2"
              style={{ borderColor: t.line, color: t.midStrong }}
            >
              {part.filename ?? "Attached file"}
            </span>
          );
        }
        if (part.type.startsWith("tool-") && "state" in part) {
          return (
            <ToolPart
              key={key}
              type={part.type}
              state={part.state}
              input={"input" in part ? part.input : undefined}
              output={"output" in part ? part.output : undefined}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
