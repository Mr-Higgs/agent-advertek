"use client";

import { useState } from "react";
import type {
  CatalogToolResult,
  CreateOrderToolResult,
  QuoteToolResult,
  SkuQuoteToolResult,
} from "@advertek/mcp-server";
import { themes } from "../theme";
import { CropMark } from "../icons";

/**
 * Tool results rendered as print-shop job tickets: hairline rules, mono
 * figures, crop-marked corners. The chat homepage is fixed to the light
 * (paper) theme.
 */
const t = themes.light;

/* ---------- money: string math only, bigint semantics, no floats ---------- */

function insertDecimal(minorUnits: string, decimals: number): string {
  const negative = minorUnits.startsWith("-");
  const digits = (negative ? minorUnits.slice(1) : minorUnits).padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}.${fraction}`;
}

/** "12500" cents → "CAD $125.00" */
function formatCadCents(amountCents: string): string {
  return `CAD $${insertDecimal(amountCents, 2)}`;
}

/** "9125000" base units → "9.125000 USDC" (exact — settlement is to the base unit). */
function formatUsdcBaseUnits(amountBaseUnits: string): string {
  return `${insertDecimal(amountBaseUnits, 6)} USDC`;
}

/* ---------- shared ticket chrome ---------- */

function Ticket({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="relative my-4">
      <CropMark className="absolute -top-[9px] -left-[9px]" stroke={t.mid} />
      <CropMark className="absolute -top-[9px] -right-[9px]" stroke={t.mid} />
      <CropMark className="absolute -bottom-[9px] -left-[9px]" stroke={t.mid} />
      <CropMark className="absolute -bottom-[9px] -right-[9px]" stroke={t.mid} />
      <div
        className="border px-5 py-4"
        style={{ borderColor: t.text, backgroundColor: t.ticketBg, color: t.ticketText }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-[0.2em] pb-3 mb-3 border-b"
          style={{ color: t.ticketMid, borderColor: t.ticketLine }}
        >
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}

function Row({ k, v }: { readonly k: string; readonly v: React.ReactNode }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 py-1.5 border-b last:border-b-0"
      style={{ borderColor: t.ticketLine }}
    >
      <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: t.ticketMid }}>
        {k}
      </span>
      <span className="font-mono text-[13px] text-right break-all">{v}</span>
    </div>
  );
}

function DemoNote({ demo }: { readonly demo: boolean | undefined }) {
  if (demo !== true) return null;
  return (
    <p className="font-mono text-[10px] uppercase tracking-wider mt-3" style={{ color: t.ticketMid }}>
      Demo pricing — figures are non-binding
    </p>
  );
}

function CopyButton({ value }: { readonly value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="font-mono text-[10px] uppercase tracking-wider border px-2 py-0.5 shrink-0"
      style={{ borderColor: t.ticketLine, color: copied ? t.ticketText : t.ticketMid }}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
          }, 1500);
        });
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ---------- cards ---------- */

const MAX_CATALOG_ROWS = 12;

export function CatalogCard({
  result,
}: {
  readonly result: CatalogToolResult & { readonly demoPricing?: boolean };
}) {
  const skus = result.skuCatalog;
  const shown = skus.slice(0, MAX_CATALOG_ROWS);
  return (
    <Ticket label={`Catalog — ${String(result.productLines.length)} product lines · ${String(skus.length)} fixed-price products`}>
      <p className="text-sm mb-3" style={{ color: t.ticketMid }}>
        {result.productLines.map((line) => line.title).join(" · ")}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <tbody>
            {shown.map((sku) => (
              <tr key={sku.sku} className="border-b last:border-b-0" style={{ borderColor: t.ticketLine }}>
                <td className="font-mono text-[11px] py-1.5 pr-3" style={{ color: t.ticketMid }}>
                  {sku.sku}
                </td>
                <td className="text-[13px] py-1.5 pr-3">{sku.name}</td>
                <td className="font-mono text-[12px] py-1.5 text-right whitespace-nowrap">
                  {formatCadCents(sku.priceCad.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {skus.length > MAX_CATALOG_ROWS ? (
        <p className="font-mono text-[10px] uppercase tracking-wider mt-3" style={{ color: t.ticketMid }}>
          …and {String(skus.length - MAX_CATALOG_ROWS)} more — ask for a category
        </p>
      ) : null}
      <DemoNote demo={result.demoPricing} />
    </Ticket>
  );
}

export function QuoteCard({
  result,
}: {
  readonly result: QuoteToolResult & { readonly demoPricing?: boolean };
}) {
  const quote = result.quote;
  if (quote === undefined) return null;
  return (
    <Ticket label="Quote">
      <div className="font-serif text-4xl leading-none mb-1">
        {formatCadCents(quote.priceCad.amountCents)}
      </div>
      <div className="font-mono text-[12px] mb-4" style={{ color: t.ticketMid }}>
        settles as {formatUsdcBaseUnits(quote.priceUsdc.amountBaseUnits)} on Solana
      </div>
      <Row k="Product line" v={quote.spec.productLine} />
      <Row
        k="Size"
        v={`${String(quote.spec.dimensions.width)} × ${String(quote.spec.dimensions.height)} mm`}
      />
      <Row k="Stock" v={`${quote.spec.stock.material} · ${String(quote.spec.stock.weight)} gsm`} />
      <Row k="Finish" v={quote.spec.finish.join(", ") || "none"} />
      <Row k="Quantity" v={String(quote.spec.quantity)} />
      <Row k="Turnaround" v={quote.spec.turnaround} />
      <DemoNote demo={result.demoPricing} />
    </Ticket>
  );
}

export function SkuQuoteCard({
  result,
}: {
  readonly result: SkuQuoteToolResult & { readonly demoPricing?: boolean };
}) {
  const quote = result.quote;
  if (quote === undefined) return null;
  return (
    <Ticket label="Quote">
      <div className="font-serif text-4xl leading-none mb-1">
        {formatCadCents(quote.priceCad.amountCents)}
      </div>
      <div className="font-mono text-[12px] mb-4" style={{ color: t.ticketMid }}>
        settles as {formatUsdcBaseUnits(quote.priceUsdc.amountBaseUnits)} on Solana
      </div>
      <Row k="Product" v={quote.name} />
      <Row k="SKU" v={quote.sku} />
      <Row k="Unit price" v={formatCadCents(quote.unitPriceCad.amountCents)} />
      <Row k="Quantity" v={String(quote.quantity)} />
      <DemoNote demo={result.demoPricing} />
    </Ticket>
  );
}

export function PaymentRequestCard({ result }: { readonly result: CreateOrderToolResult }) {
  const order = result.order;
  if (order === undefined) return null;
  const decimalAmount = insertDecimal(order.amountBaseUnits, order.usdcDecimals).replace(/,/g, "");
  const solanaPayUrl = `solana:${order.settlementWallet}?amount=${decimalAmount}&spl-token=${order.usdcMintAddress}&memo=${encodeURIComponent(order.memo)}`;
  return (
    <Ticket label="Payment request">
      <div className="font-serif text-4xl leading-none mb-1">
        {formatUsdcBaseUnits(order.amountBaseUnits)}
      </div>
      <div className="font-mono text-[12px] mb-4" style={{ color: t.ticketMid }}>
        pay exactly this amount, memo attached, in one transaction
      </div>
      <Row k="Order" v={order.orderId} />
      <Row
        k="Pay to"
        v={
          <span className="inline-flex items-center gap-2">
            {order.settlementWallet}
            <CopyButton value={order.settlementWallet} />
          </span>
        }
      />
      <Row
        k="Memo"
        v={
          <span className="inline-flex items-center gap-2">
            {order.memo}
            <CopyButton value={order.memo} />
          </span>
        }
      />
      <Row k="USDC mint" v={order.usdcMintAddress} />
      <a
        href={solanaPayUrl}
        className="block text-center font-mono text-[12px] uppercase tracking-widest mt-4 px-4 py-3"
        style={{ backgroundColor: t.accent, color: t.accentContrast }}
      >
        Open in wallet
      </a>
      <p className="font-mono text-[10px] uppercase tracking-wider mt-3" style={{ color: t.ticketMid }}>
        A transfer without this memo, amount, or address is not credited
      </p>
    </Ticket>
  );
}

export interface OrderStatusResult {
  readonly ok: boolean;
  readonly orderId?: string;
  readonly status?: string;
  readonly events?: readonly { readonly status: string; readonly occurredAt: string }[];
}

export function OrderStatusCard({ result }: { readonly result: OrderStatusResult }) {
  if (!result.ok || result.status === undefined) return null;
  return (
    <Ticket label={`Order ${result.orderId ?? ""}`}>
      <div className="font-serif text-3xl leading-none mb-4">{result.status}</div>
      {(result.events ?? []).map((event) => (
        <Row
          k={new Date(event.occurredAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
          v={event.status}
          key={`${event.status}-${event.occurredAt}`}
        />
      ))}
    </Ticket>
  );
}
