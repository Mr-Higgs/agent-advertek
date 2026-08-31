import { tool } from "ai";
import { z } from "zod";
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
      inputSchema: createOrderRequestSchema,
      execute: (input) => buildCreateOrderToolResult(executors.executeCreateOrder, input),
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
