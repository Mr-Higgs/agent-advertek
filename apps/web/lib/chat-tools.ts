import { tool } from "ai";
import { z } from "zod";
import { getPodPriceListEntry } from "@advertek/catalog";
import type { OrderStatusView } from "@advertek/db";
import {
  ADVERTEK_TOOL_GUIDANCE,
  buildCatalogToolResult,
  buildCreateOrderToolResult,
  buildQuoteToolResult,
  buildSkuQuoteToolResult,
  createOrderRequestSchema,
  quoteToolInputSchema,
  skuQuoteToolInputSchema,
} from "@advertek/mcp-server";
import type { QuoteExecutors } from "@/lib/quotes";

export interface ChatToolDeps {
  readonly executors: QuoteExecutors;
  /** Order lookup for the status tool; injected so tests never touch a database. */
  readonly getOrderStatus: (orderId: string) => Promise<OrderStatusView | undefined>;
}

const orderStatusInputSchema = z.object({
  orderId: z.string().min(1).describe("The ord_… id returned by create_order."),
});

const mockupInputSchema = z.object({
  sku: z.string().min(1).describe("A POD SKU code from get_catalog, e.g. MUG-11-WHT."),
  artworkUrl: z.string().url().describe("The customer's uploaded artwork https URL."),
});

export type MockupOrientation = "vertical" | "horizontal" | "square";

export interface MockupToolResult {
  readonly ok: boolean;
  readonly sku?: string;
  readonly name?: string;
  readonly category?: string;
  readonly artworkUrl?: string;
  readonly orientation?: MockupOrientation;
  readonly error?: string;
}

function toJsonSafe(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

/**
 * create_order's input schema as the chat tool uses it: full validation,
 * then transformed back to JSON-safe values — the AI SDK streams the
 * validated input to the browser, and a bigint (customsValueUsdCents
 * coercion) would make JSON.stringify throw and kill the stream.
 */
export const chatCreateOrderInputSchema = createOrderRequestSchema.transform(toJsonSafe);

/** Orientation lives only in SKU suffixes and names — there is no structured field. */
function parseOrientation(sku: string, name: string): MockupOrientation {
  if (/-V(-|$)/.test(sku) || /vertical/i.test(name)) return "vertical";
  if (/-H(-|$)/.test(sku) || /horizontal/i.test(name)) return "horizontal";
  return "square";
}

/**
 * The web chat agent's tool belt: the same four rail tools the MCP transports
 * expose (same schemas, same result builders, same descriptions — one source
 * of truth), plus a chat-only order-status lookup. Every result is plain JSON
 * with money already rendered as decimal strings; no bigint ever reaches the
 * AI SDK's serializer.
 */
export function createChatTools(deps: ChatToolDeps) {
  const { executors } = deps;
  return {
    get_catalog: tool({
      description: ADVERTEK_TOOL_GUIDANCE.get_catalog,
      inputSchema: z.object({}),
      execute: async () => ({
        ...(await buildCatalogToolResult({ spotRateClient: executors.spotRateClient })),
        demoPricing: executors.isDemoPricing,
      }),
    }),
    get_quote: tool({
      description: ADVERTEK_TOOL_GUIDANCE.get_quote,
      inputSchema: quoteToolInputSchema,
      execute: async (input) => ({
        ...(await buildQuoteToolResult(executors.executeQuote, input)),
        demoPricing: executors.isDemoPricing,
      }),
    }),
    get_sku_quote: tool({
      description: ADVERTEK_TOOL_GUIDANCE.get_sku_quote,
      inputSchema: skuQuoteToolInputSchema,
      execute: async (input) => ({
        ...(await buildSkuQuoteToolResult(executors.executeSkuQuote, input)),
        demoPricing: executors.isDemoPricing,
      }),
    }),
    create_order: tool({
      description: ADVERTEK_TOOL_GUIDANCE.create_order,
      inputSchema: chatCreateOrderInputSchema,
      execute: (input) =>
        buildCreateOrderToolResult(executors.executeCreateOrder, createOrderRequestSchema.parse(input)),
    }),
    render_mockup: tool({
      description:
        "Render a live product mockup of the customer's uploaded artwork on a print-on-demand product. Call this as soon as a specific SKU is picked or strongly recommended, before quoting — the chat renders the preview card for the customer. Use a real SKU code from get_catalog and the artwork https URL from the customer's message.",
      inputSchema: mockupInputSchema,
      execute: ({ sku, artworkUrl }): Promise<MockupToolResult> => {
        const entry = getPodPriceListEntry(sku);
        if (entry === undefined) {
          return Promise.resolve({ ok: false, error: `Unknown SKU: ${sku}` });
        }
        return Promise.resolve({
          ok: true,
          sku: entry.sku,
          name: entry.name,
          category: entry.category,
          artworkUrl,
          orientation: parseOrientation(entry.sku, entry.name),
        });
      },
    }),
    get_order_status: tool({
      description:
        "Look up an existing Advertek order by the ord_… id returned by create_order. Returns the current status (e.g. awaiting payment, paid, in production, shipped) and the full status-event timeline. Use this when the customer asks whether their payment landed or where their order is. Never invent a status.",
      inputSchema: orderStatusInputSchema,
      execute: async ({ orderId }) => {
        try {
          const order = await deps.getOrderStatus(orderId);
          if (order === undefined) {
            return { ok: false as const, error: `Unknown order: ${orderId}` };
          }
          return {
            ok: true as const,
            orderId: order.orderId,
            status: order.status,
            vendorOrderId: order.vendorOrderId,
            payment: {
              signature: order.paymentSignature,
              amountBaseUnits:
                order.paymentAmountBaseUnits === null
                  ? null
                  : order.paymentAmountBaseUnits.toString(),
              slot: order.paymentSlot,
            },
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
            events: order.events.map((event) => ({
              status: event.status,
              occurredAt: event.occurredAt.toISOString(),
              recordedAt: event.recordedAt.toISOString(),
            })),
          };
        } catch {
          return { ok: false as const, error: "Order lookup failed" };
        }
      },
    }),
  };
}

export type ChatTools = ReturnType<typeof createChatTools>;
