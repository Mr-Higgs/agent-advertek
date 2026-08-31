import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { readOrderStatus } from "@advertek/db";
import { tryLoadChatConfig } from "@/lib/chat-config";
import { createChatTools } from "@/lib/chat-tools";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/json";
import { createQuoteExecutors } from "@/lib/quotes";
import { checkRateLimit, clientIpAddress } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The storefront concierge behind the homepage chat. Public by design (it is
 * the homepage), so cost is bounded by per-IP rate limiting, a history cap,
 * and the step cap — and every price it utters comes from the same tool
 * builders the MCP transports use, never from the model.
 */

const SYSTEM_PROMPT = `You are the print concierge for Advertek, a real commercial printer in North York, Ontario (offset, digital, wide format, book manufacturing, dye sublimation, wall decor, direct mail, embellishments, packaging, bindery, and print-on-demand). Visitors tell you what they want made; you find it, price it, and place the order.

Ground rules:
- Never invent prices, SKU codes, product names, order ids, or statuses. Every figure you state must come from a tool result. If you have not called get_catalog yet and the customer asks what exists or you are unsure of valid enums, call it first.
- Prices are quoted in CAD and settled in USDC on Solana. Tool results carry money as integer strings in minor units: CAD cents (divide by 100) and USDC base units (6 decimals). Present them as human currency ("CAD $12.50", "9.13 USDC"), and round USDC display to 2 decimals while making clear the payable amount is exact.
- When a tool result carries demoPricing: true, tell the customer the figure is a non-binding demo price.
- If a tool returns ok: false, read its issues, fix your input, and retry. Do not surface raw error objects; explain the problem plainly.

Ordering flow — collect all of this before calling create_order:
1. What they want: either a print-on-demand SKU from the catalog (quote it with get_sku_quote) or a custom job as a full spec (quote it with get_quote: productLine, dimensions in mm, stock material + weight in gsm, finish array, quantity, turnaround).
2. Artwork: every item needs at least one print-ready file as an https URL. The customer can attach a file with the paperclip (it arrives in their message as an "Artwork:" URL) or paste a link. Do not order without it.
3. Ship-to and sold-to: name, address1, city, postal_code, country_code (2-letter), region_code where applicable. Usually the same; ask once and reuse unless told otherwise.
4. The Solana wallet that will pay: a base58 public key. The payment comes from the customer's own wallet; you never handle funds.

You supply sensible values the customer should not be asked about: customerOrderNumber (derive one from the date, e.g. "web-2026-08-31-1"), internalItemId per item ("item-1", "item-2", ...), customsValueUsdCents from the quoted price, locationCode "TOR-01", shippingService "ground", orderType "standard". For a print-on-demand SKU, build the item spec as productLine "printOnDemand" with the product's nominal dimensions in mm, stock.material set to the SKU code, stock.weight 200, finish ["none"], and the customer's chosen quantity — the rail re-prices at intake and its returned amount is authoritative.

After create_order succeeds, present the payment request exactly: the order id, and the instruction to send exactly amountBaseUnits of the given USDC mint to settlementWallet in a single Solana transaction carrying the memo string verbatim in a Memo-program instruction. The memo is how the payment is matched to the order; a transfer without it, with a different amount, or to a different address is not credited. Never restate the amount from memory — copy it from the tool result. Use get_order_status when they ask whether payment landed or where the order is.

Style: plain prose, short paragraphs, sentence case. No markdown tables, no headings, no emoji. Be concrete and quick — one question at a time when gathering details. You are a shop counter, not a chatbot: confirm what was ordered, what it costs, and what happens next.`;

const bodySchema = z.object({
  // ponytail: shallow cap only — validateUIMessages does the deep validation.
  messages: z.array(z.unknown()).min(1).max(60),
});

export async function POST(request: Request): Promise<Response> {
  const config = tryLoadChatConfig();
  if (config === undefined) {
    return jsonResponse(
      { ok: false, error: "Chat is not configured on this deployment" },
      { status: 503 },
    );
  }

  const decision = checkRateLimit(`chat:ip:${clientIpAddress(request)}`);
  if (!decision.allowed) {
    return jsonResponse(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429, headers: { "retry-after": String(decision.retryAfterSeconds) } },
    );
  }

  const body = bodySchema.safeParse(await request.json().catch(() => undefined));
  if (!body.success) {
    return jsonResponse({ ok: false, error: "Invalid chat request body" }, { status: 400 });
  }

  let modelMessages;
  try {
    const uiMessages = await validateUIMessages({ messages: body.data.messages });
    modelMessages = await convertToModelMessages(uiMessages, {
      ignoreIncompleteToolCalls: true,
    });
  } catch {
    return jsonResponse({ ok: false, error: "Invalid chat messages" }, { status: 400 });
  }

  const anthropic = createAnthropic({ apiKey: config.apiKey });
  const result = streamText({
    model: anthropic(config.modelId),
    instructions: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: createChatTools({
      executors: createQuoteExecutors(),
      getOrderStatus: (orderId) => readOrderStatus(getDb(), orderId),
    }),
    stopWhen: isStepCount(config.maxSteps),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
