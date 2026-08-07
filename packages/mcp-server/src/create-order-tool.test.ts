import { describe, expect, it, vi } from "vitest";
import {
  buildCreateOrderToolResult,
  createOrderToolResultSchema,
  type CreatedOrder,
  type CreateOrderRequest,
} from "./create-order-tool.js";

const address = {
  name: "Ada Lovelace",
  address1: "1 Print Way",
  city: "Toronto",
  postal_code: "M1M 1M1",
  country_code: "CA",
};

const validInput = {
  payerPublicKey: "9xQeWvG816bUx9EPa2rQ1V1nrmUt8oe1r6c2p8s9Xtvz",
  order: {
    customerOrderNumber: "CUST-1",
    locationCode: "NYK",
    shippingService: "ground",
    soldTo: address,
    shipTo: address,
    items: [
      {
        internalItemId: "item_1",
        customsValueUsdCents: "19990",
        spec: {
          productLine: "wideFormat",
          dimensions: { width: 610, height: 914 },
          stock: { material: "13oz matte vinyl", weight: 450 },
          finish: ["matte"],
          quantity: 40,
          turnaround: "standard",
          assets: [{ url: "https://assets.example.com/banner.pdf" }],
        },
      },
    ],
  },
};

const createdOrder: CreatedOrder = {
  orderId: "ord_1",
  memo: "advertek:order:ord_1:nonce",
  settlementWallet: "Sett1ementWa11et",
  amountBaseUnits: 9_007_199_254_740_993n,
  usdcMintAddress: "UsdcMint",
  usdcDecimals: 6,
  webhookSubscriptionId: "sub_1",
};

describe("create_order payload", () => {
  it("returns the rail-issued payment request with the amount as a decimal string", async () => {
    const executeCreateOrder = vi.fn(
      (): Promise<CreatedOrder> => Promise.resolve(createdOrder),
    );

    const result = await buildCreateOrderToolResult(executeCreateOrder, validInput);

    expect(createOrderToolResultSchema.parse(result)).toEqual(result);
    expect(result).toEqual({
      ok: true,
      order: {
        orderId: "ord_1",
        memo: "advertek:order:ord_1:nonce",
        settlementWallet: "Sett1ementWa11et",
        amountBaseUnits: "9007199254740993",
        usdcMintAddress: "UsdcMint",
        usdcDecimals: 6,
        webhookSubscriptionId: "sub_1",
      },
    });
  });

  it("passes the parsed order through with customs values as bigint cents", async () => {
    let received: CreateOrderRequest | undefined;
    const executeCreateOrder = (request: CreateOrderRequest): Promise<CreatedOrder> => {
      received = request;
      return Promise.resolve(createdOrder);
    };

    await buildCreateOrderToolResult(executeCreateOrder, validInput);

    expect(received?.order.items[0]?.customsValueUsdCents).toBe(19_990n);
  });

  it("rejects a malformed order without creating anything", async () => {
    const executeCreateOrder = vi.fn(
      (): Promise<CreatedOrder> => Promise.resolve(createdOrder),
    );

    const result = await buildCreateOrderToolResult(executeCreateOrder, {
      ...validInput,
      payerPublicKey: "not-a-solana-key!",
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("invalid_order");
    expect(result.error?.issues?.length).toBeGreaterThan(0);
    expect(executeCreateOrder).not.toHaveBeenCalled();
    expect(createOrderToolResultSchema.parse(result)).toEqual(result);
  });

  it("reports an intake failure as a structured error rather than throwing", async () => {
    const executeCreateOrder = vi.fn(
      (): Promise<CreatedOrder> => Promise.reject(new Error("pricing upstream down")),
    );

    const result = await buildCreateOrderToolResult(executeCreateOrder, validInput);

    expect(result).toEqual({
      ok: false,
      error: { code: "order_failed", message: "pricing upstream down" },
    });
  });
});
