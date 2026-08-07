import type { SqlExecutor } from "@advertek/db";
import type { RealtimeQuote } from "@advertek/quote-api";
import type { CreateOrderRequest } from "@advertek/mcp-server";
import type { SettlementPublicConfig } from "@advertek/payments";
import { describe, expect, it, vi } from "vitest";
import { createOrderIntake } from "./orders";

interface RecordedQuery {
  readonly text: string;
  readonly params: readonly unknown[];
}

interface FakeSqlExecutor extends SqlExecutor {
  readonly queries: readonly RecordedQuery[];
}

/** Recording fake for the persistence seam — no unit test touches Postgres. */
function createFakeExecutor(): FakeSqlExecutor {
  const queries: RecordedQuery[] = [];
  const executor: FakeSqlExecutor = {
    queries,
    query<T>(text: string, params: readonly unknown[] = []): Promise<readonly T[]> {
      queries.push({ text, params });
      return Promise.resolve([] as readonly T[]);
    },
    transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      return fn(executor);
    },
  };
  return executor;
}

const settlementConfig: SettlementPublicConfig = {
  settlementWallet: "3nQeWvG816bUx9EPa2rQ1V1nrmUt8oe1r6c2p8s9Xtvz",
  usdcMintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  usdcDecimals: 6,
};

const address = {
  name: "Ada Lovelace",
  address1: "1 Print Way",
  city: "Toronto",
  postal_code: "M1M 1M1",
  country_code: "CA",
};

function item(internalItemId: string) {
  return {
    internalItemId,
    customsValueUsdCents: 19_990n,
    options: [],
    spec: {
      productLine: "wideFormat" as const,
      dimensions: { width: 610, height: 914 },
      stock: { material: "13oz matte vinyl", weight: 450 },
      finish: ["matte" as const],
      quantity: 40,
      turnaround: "standard" as const,
      assets: [{ url: "https://assets.example.com/banner.pdf" }],
    },
  };
}

function request(overrides: Partial<CreateOrderRequest> = {}): CreateOrderRequest {
  return {
    payerPublicKey: "9xQeWvG816bUx9EPa2rQ1V1nrmUt8oe1r6c2p8s9Xtvz",
    order: {
      customerOrderNumber: "CUST-1",
      locationCode: "NYK",
      shippingService: "ground",
      orderType: "standard",
      soldTo: address,
      shipTo: address,
      items: [item("item_1")],
    },
    ...overrides,
  };
}

function quoteWorth(amountBaseUnits: bigint): RealtimeQuote {
  return {
    spec: item("item_1").spec,
    printProcess: "wide-format",
    priceCad: { currency: "CAD", amountCents: 12_500n },
    priceUsdc: { currency: "USDC", amountBaseUnits },
    quotedAt: new Date("2026-08-07T00:00:00.000Z"),
  };
}

function intakeWith(executor: FakeSqlExecutor, executeQuote = vi.fn(() =>
  Promise.resolve(quoteWorth(91_250_000n)),
)) {
  return {
    executeQuote,
    intake: createOrderIntake({
      executeQuote,
      getExecutor: () => executor,
      getSettlementConfig: () => settlementConfig,
      createOrderId: () => "ord_fixed",
      createSubscriptionId: () => "sub_fixed",
      now: () => new Date("2026-08-07T00:00:00.000Z"),
    }),
  };
}

describe("createOrderIntake", () => {
  it("mints the order id server-side and ignores anything the client sent", async () => {
    const executor = createFakeExecutor();
    const { intake } = intakeWith(executor);

    const order = await intake(request());

    expect(order.orderId).toBe("ord_fixed");
    expect(order.memo).toMatch(/^advertek:order:ord_fixed:/);
    const insert = executor.queries.find((query) =>
      query.text.includes("INSERT INTO orders"),
    );
    expect(insert?.params[0]).toBe("ord_fixed");
  });

  it("prices every item itself and never trusts a client amount", async () => {
    const executor = createFakeExecutor();
    const executeQuote = vi
      .fn()
      .mockResolvedValueOnce(quoteWorth(91_250_000n))
      .mockResolvedValueOnce(quoteWorth(8_750_000n));
    const { intake } = intakeWith(executor, executeQuote);

    const order = await intake(
      request({
        order: { ...request().order, items: [item("item_1"), item("item_2")] },
      }),
    );

    expect(executeQuote).toHaveBeenCalledTimes(2);
    expect(order.amountBaseUnits).toBe(100_000_000n);
  });

  it("sums item prices without floating point loss", async () => {
    const executor = createFakeExecutor();
    const executeQuote = vi
      .fn()
      .mockResolvedValueOnce(quoteWorth(9_007_199_254_740_993n))
      .mockResolvedValueOnce(quoteWorth(1n));
    const { intake } = intakeWith(executor, executeQuote);

    const order = await intake(
      request({
        order: { ...request().order, items: [item("item_1"), item("item_2")] },
      }),
    );

    expect(order.amountBaseUnits).toBe(9_007_199_254_740_994n);
  });

  it("writes a webhook_subscriptions row bound to the minted order id when a callbackUrl is given", async () => {
    const executor = createFakeExecutor();
    const { intake } = intakeWith(executor);

    const order = await intake(
      request({ callbackUrl: "https://agent.example.com/hooks/advertek" }),
    );

    const insert = executor.queries.find((query) =>
      query.text.includes("INSERT INTO webhook_subscriptions"),
    );
    expect(insert?.params).toEqual([
      "sub_fixed",
      "ord_fixed",
      "https://agent.example.com/hooks/advertek",
      "AGENT_WEBHOOK_SIGNING_SECRET",
    ]);
    expect(order.webhookSubscriptionId).toBe("sub_fixed");
  });

  it("writes no subscription row when no callbackUrl is given", async () => {
    const executor = createFakeExecutor();
    const { intake } = intakeWith(executor);

    const order = await intake(request());

    expect(
      executor.queries.some((query) =>
        query.text.includes("INSERT INTO webhook_subscriptions"),
      ),
    ).toBe(false);
    expect(order.webhookSubscriptionId).toBeUndefined();
  });

  it("returns a payment request built only from public settlement config", async () => {
    const executor = createFakeExecutor();
    const { intake } = intakeWith(executor);

    const order = await intake(request());

    expect(order.settlementWallet).toBe(settlementConfig.settlementWallet);
    expect(order.usdcMintAddress).toBe(settlementConfig.usdcMintAddress);
    expect(order.usdcDecimals).toBe(6);
    expect(order.amountBaseUnits).toBe(91_250_000n);
  });
});
