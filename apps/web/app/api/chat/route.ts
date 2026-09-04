import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { ChatConfig } from "@/lib/chat-config";
import { z } from "zod";
import { readOrderStatus } from "@advertek/db";
import { tryLoadChatConfig } from "@/lib/chat-config";
import { createChatTools } from "@/lib/chat-tools";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/json";
import { createQuoteExecutors } from "@/lib/quotes";
import { checkRateLimit, clientIpAddress } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * The storefront concierge behind the homepage chat. Public by design (it is
 * the homepage), so cost is bounded by per-IP rate limiting, a history cap,
 * and the step cap — and every price it utters comes from the same tool
 * builders the MCP transports use, never from the model.
 */

/**
 * Demo-only payer: the Solana System Program address. It satisfies
 * create_order's base58 schema while being unmistakably not a customer
 * wallet — payment in this demo is simulated, never collected.
 */
const DEMO_PAYER_PUBLIC_KEY = "11111111111111111111111111111111";

const SYSTEM_PROMPT = `You are the print concierge for Advertek, a real commercial printer in North York, Ontario. Customers bring you artwork; you turn it into printed products: look at what they uploaded, recommend products from the print-on-demand catalog, preview it, price it, and place the order. The whole experience should feel as easy as ordering a pizza.

Ground rules:
- Never invent prices, SKU codes, product names, order ids, or statuses. Every figure you state must come from a tool result. If you have not called get_catalog yet and you are unsure which SKUs exist, call it first.
- Prices are quoted in CAD and settled in USDC on Solana. Tool results carry money as integer strings in minor units: CAD cents (divide by 100) and USDC base units (6 decimals). Present them as human currency ("CAD $12.90", "9.13 USDC"), and round USDC display to 2 decimals while making clear the payable amount is exact.
- When a tool result carries demoPricing: true, tell the customer the figure is a non-binding demo price.
- If a tool returns ok: false, read its issues, fix your input, and retry. Do not surface raw error objects; explain the problem plainly.

When artwork arrives (the customer attaches a file with the paperclip; it appears in their message as an "Artwork:" URL, and viewable images are also attached so you can see them):
1. Look at the image and describe it in one or two sentences — subject, palette, orientation (portrait, landscape, or square).
2. Recommend two to four catalog products that suit it, matching orientation: vertical art suits TEE-CN-V-* shirts, PUZ-315-V / PUZ-1000-V puzzles, TWL-3060-V towels, and portrait canvas sizes; horizontal art suits the -H variants and landscape canvas sizes. State prices only from tool results.
3. If you cannot view the file (PDF, TIFF, SVG), say so and ask for a one-line description of the art instead.

Once they pick a product, call render_mockup with the SKU and the artwork URL — the chat renders a live preview card — then quote it with get_sku_quote. Describe the preview in a few words, give the price, and ask for what is still missing.

Keep questions minimal. Ask only for: the product choice (plus size or shirt size where the catalog has variants), quantity (default 1), and the ship-to name and address (address1, city, postal_code, 2-letter country_code, region_code where applicable). Use the ship-to as sold-to unless told otherwise.

You supply everything else yourself: customerOrderNumber (derive one from the date, e.g. "web-2026-09-03-1"), internalItemId per item ("item-1", "item-2", ...), customsValueUsdCents from the quoted price, locationCode "TOR-01", shippingService "ground", orderType "standard". For a print-on-demand SKU, build the item spec as productLine "printOnDemand" with the product's nominal dimensions in mm, stock.material set to the SKU code, stock.weight 200, finish ["none"], the chosen quantity, and assets [{ url: the artwork URL }] — the rail re-prices at intake and its returned amount is authoritative. This is a demo deployment: use payerPublicKey "${DEMO_PAYER_PUBLIC_KEY}" (a placeholder — never ask the customer for a wallet; payment here is simulated).

Before calling create_order, confirm the order in one line — product, quantity, total — and get an explicit yes.

After create_order succeeds, the chat shows a payment-request card. Tell the customer they can pay from a Solana wallet with the memo shown, or — since this is a demo — press the "Simulate payment (demo)" button on the card; no real funds move. When they say they have paid or ask where the order is, call get_order_status once: the chat renders a live tracker that follows the order to completion on its own, so never call it repeatedly for the same order.

For custom jobs outside the POD catalog, quote with get_quote (full spec: productLine, dimensions in mm, stock material + weight in gsm, finish array, quantity, turnaround); the same rules apply otherwise.

Style: plain prose, short paragraphs, sentence case. No markdown of any kind — the chat renders raw text, so asterisks, bullet markers, tables, headings, and emoji all show as literal characters. Separate options with line breaks and simple dashes. Be concrete and quick — at most one question at a time. You are a shop counter, not a chatbot: confirm what was ordered, what it costs, and what happens next.`;

const bodySchema = z.object({
  // ponytail: shallow cap only — validateUIMessages does the deep validation.
  messages: z.array(z.unknown()).min(1).max(60),
});

function chatModel(config: ChatConfig): LanguageModel {
  console.log(`chat: model=${config.modelId} via anthropic`);
  const anthropic = createAnthropic({
    apiKey: config.apiKey,
    ...(config.workspaceId !== undefined
      ? { headers: { "anthropic-workspace-id": config.workspaceId } }
      : {}),
  });
  return anthropic(config.modelId);
}

const MAX_ERROR_MESSAGE_CHARS = 300;

/**
 * Logs the full stream error server-side and forwards a readable message to
 * the chat UI — deliberate for this demo route: the masked default ("An
 * error occurred") hides actionable problems like provider tier limits.
 */
function describeStreamError(error: unknown): string {
  console.error("Chat stream error:", error);
  const message = error instanceof Error ? error.message : String(error);
  const trimmed = message.trim();
  if (trimmed.length === 0) return "The model request failed";
  return trimmed.length > MAX_ERROR_MESSAGE_CHARS
    ? `${trimmed.slice(0, MAX_ERROR_MESSAGE_CHARS)}…`
    : trimmed;
}

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

  const result = streamText({
    model: chatModel(config),
    instructions: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: createChatTools({
      executors: createQuoteExecutors(),
      getOrderStatus: (orderId) => readOrderStatus(getDb(), orderId),
    }),
    stopWhen: isStepCount(config.maxSteps),
    // Adaptive is the only thinking mode claude-sonnet-5 accepts, and
    // "summarized" display is required — the default omits thinking text,
    // which would leave the chat's reasoning stream empty.
    providerOptions: {
      anthropic: { thinking: { type: "adaptive", display: "summarized" } },
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      sendReasoning: true,
      onError: describeStreamError,
    }),
  });
}
