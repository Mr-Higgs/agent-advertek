import { describe, expect, it } from "vitest";
import type { SkuSpec } from "@advertek/types";
import type { OrderStatusView } from "@advertek/db";
import { createChatTools, type ChatToolDeps } from "./chat-tools";
import type { QuoteExecutors } from "./quotes";

const spec: SkuSpec = {
  productLine: "digital",
  dimensions: { width: 148, height: 210 },
  stock: { material: "gloss text", weight: 170 },
  finish: ["matte"],
  quantity: 500,
  turnaround: "standard",
  assets: [{ url: "https://example.com/print-ready/artwork.pdf" }],
};

const quotedAt = new Date("2026-08-31T12:00:00.000Z");

const executors: QuoteExecutors = {
  spotRateClient: {
    getUsdcBaseUnitsPerCadDollar: () => Promise.resolve(730_000n),
  },
  executeQuote: () =>
    Promise.resolve({
      spec,
      printProcess: "digital",
      priceCad: { currency: "CAD", amountCents: 12_500n },
      priceUsdc: { currency: "USDC", amountBaseUnits: 9_125_000n },
      quotedAt,
    }),
  executeSkuQuote: () =>
    Promise.resolve({
      sku: "MUG-11-WHT",
      name: "11oz White Mug",
      category: "mugs",
      quantity: 2,
      unitPriceCad: { currency: "CAD", amountCents: 1_900n },
      priceCad: { currency: "CAD", amountCents: 3_800n },
      priceUsdc: { currency: "USDC", amountBaseUnits: 2_774_000n },
      quotedAt,
    }),
  executeCreateOrder: () =>
    Promise.resolve({
      orderId: "ord_test-1",
      memo: "advertek:ord_test-1",
      settlementWallet: "SettLement1111111111111111111111111111111111",
      amountBaseUnits: 9_125_000n,
      usdcMintAddress: "Mint11111111111111111111111111111111111111",
      usdcDecimals: 6,
    }),
  isDemoPricing: true,
};

const orderStatus: OrderStatusView = {
  orderId: "ord_test-1",
  status: "paid",
  paymentSignature: "sig",
  paymentAmountBaseUnits: 9_125_000n,
  paymentSlot: 42,
  vendorOrderId: null,
  createdAt: quotedAt,
  updatedAt: quotedAt,
  events: [{ status: "paid", occurredAt: quotedAt, recordedAt: quotedAt }],
};

function makeDeps(overrides?: Partial<ChatToolDeps>): ChatToolDeps {
  return {
    executors,
    getOrderStatus: () => Promise.resolve(orderStatus),
    ...overrides,
  };
}

const callOptions = { toolCallId: "call-1", messages: [], context: {} };

describe("createChatTools", () => {
  it("quotes a full spec with money as decimal strings", async () => {
    const result = await createChatTools(makeDeps()).get_quote.execute(spec, callOptions);
    expect(result).toMatchObject({
      ok: true,
      demoPricing: true,
      quote: {
        priceCad: { currency: "CAD", amountCents: "12500" },
        priceUsdc: { currency: "USDC", amountBaseUnits: "9125000" },
        quotedAt: "2026-08-31T12:00:00.000Z",
      },
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("quotes a POD SKU and never lets a bigint escape", async () => {
    const result = await createChatTools(makeDeps()).get_sku_quote.execute(
      { sku: "MUG-11-WHT", quantity: 2 },
      callOptions,
    );
    expect(result).toMatchObject({
      ok: true,
      quote: { sku: "MUG-11-WHT", priceCad: { amountCents: "3800" } },
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("returns structured issues instead of throwing on an invalid spec", async () => {
    // The builder re-validates internally; the cast simulates a malformed model tool call.
    const result = await createChatTools(makeDeps()).get_quote.execute(
      { productLine: "digital" } as unknown as SkuSpec,
      callOptions,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "invalid_sku_spec" } });
    expect((result as { error: { issues: unknown[] } }).error.issues.length).toBeGreaterThan(0);
  });

  it("surfaces the payment request from create_order", async () => {
    const result = await createChatTools(makeDeps()).create_order.execute(
      {
        payerPublicKey: "Payer1111111111111111111111111111111111111",
        order: {
          customerOrderNumber: "web-2026-08-31",
          locationCode: "TOR-01",
          shippingService: "ground",
          orderType: "standard",
          soldTo: address(),
          shipTo: address(),
          items: [
            {
              internalItemId: "item-1",
              customsValueUsdCents: 1000n,
              spec,
              options: [],
            },
          ],
        },
      },
      callOptions,
    );
    expect(result).toMatchObject({
      ok: true,
      order: {
        orderId: "ord_test-1",
        memo: "advertek:ord_test-1",
        settlementWallet: "SettLement1111111111111111111111111111111111",
        amountBaseUnits: "9125000",
        usdcMintAddress: "Mint11111111111111111111111111111111111111",
      },
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("returns the order status timeline with stringified money and ISO dates", async () => {
    const result = await createChatTools(makeDeps()).get_order_status.execute(
      { orderId: "ord_test-1" },
      callOptions,
    );
    expect(result).toMatchObject({
      ok: true,
      status: "paid",
      payment: { amountBaseUnits: "9125000" },
      events: [{ status: "paid", occurredAt: "2026-08-31T12:00:00.000Z" }],
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("reports an unknown order without throwing", async () => {
    const tools = createChatTools(
      makeDeps({ getOrderStatus: () => Promise.resolve(undefined) }),
    );
    const result = await tools.get_order_status.execute(
      { orderId: "ord_missing" },
      callOptions,
    );
    expect(result).toMatchObject({ ok: false, error: "Unknown order: ord_missing" });
  });

  it("turns an order lookup failure into a structured error", async () => {
    const tools = createChatTools(
      makeDeps({ getOrderStatus: () => Promise.reject(new Error("db down")) }),
    );
    const result = await tools.get_order_status.execute(
      { orderId: "ord_test-1" },
      callOptions,
    );
    expect(result).toMatchObject({ ok: false, error: "Order lookup failed" });
  });
});

function address() {
  return {
    name: "Ada Lovelace",
    address1: "1 Analytical Way",
    city: "Toronto",
    region_code: "ON",
    postal_code: "M1M 1M1",
    country_code: "CA",
  };
}
