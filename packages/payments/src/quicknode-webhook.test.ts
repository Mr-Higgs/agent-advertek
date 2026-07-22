import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildPaymentMemo } from "./payment-request.js";
import {
  WebhookPayloadValidationError,
  WebhookSignatureVerificationError,
  handleQuickNodeWebhook,
  verifyQuickNodeSignature,
  type QuickNodeWebhookPayload,
} from "./quicknode-webhook.js";

const securityToken = "test-security-token";

function signBody(nonce: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", securityToken)
    .update(nonce + timestamp + rawBody, "utf8")
    .digest("hex");
}

function buildRequest(payload: QuickNodeWebhookPayload) {
  const nonce = "nonce-1";
  const timestamp = "1732000000";
  const rawBody = JSON.stringify(payload);
  const signature = signBody(nonce, timestamp, rawBody);
  return {
    headers: {
      "x-qn-nonce": nonce,
      "x-qn-timestamp": timestamp,
      "x-qn-signature": signature,
    },
    rawBody,
  };
}

describe("verifyQuickNodeSignature", () => {
  it("accepts a correctly computed signature", () => {
    const rawBody = '{"hello":"world"}';
    const signatureHex = signBody("n1", "100", rawBody);
    expect(
      verifyQuickNodeSignature({
        nonce: "n1",
        timestamp: "100",
        rawBody,
        signatureHex,
        securityToken,
      }),
    ).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const rawBody = '{"hello":"world"}';
    const signatureHex = createHmac("sha256", "wrong-secret")
      .update("n1" + "100" + rawBody, "utf8")
      .digest("hex");
    expect(
      verifyQuickNodeSignature({
        nonce: "n1",
        timestamp: "100",
        rawBody,
        signatureHex,
        securityToken,
      }),
    ).toBe(false);
  });

  it("rejects a signature computed over a different body (tampering)", () => {
    const signedBody = '{"amount":100}';
    const tamperedBody = '{"amount":100000}';
    const signatureHex = signBody("n1", "100", signedBody);
    expect(
      verifyQuickNodeSignature({
        nonce: "n1",
        timestamp: "100",
        rawBody: tamperedBody,
        signatureHex,
        securityToken,
      }),
    ).toBe(false);
  });

  it("rejects malformed (non-hex) signatures without throwing", () => {
    expect(
      verifyQuickNodeSignature({
        nonce: "n1",
        timestamp: "100",
        rawBody: "{}",
        signatureHex: "not-hex!!",
        securityToken,
      }),
    ).toBe(false);
  });
});

describe("handleQuickNodeWebhook", () => {
  it("processes verified confirmed transfers and looks up orders by memo", async () => {
    const memo = buildPaymentMemo("ord_777", "nonceA");
    const request = buildRequest({
      confirmedTransfers: [
        {
          signature: "sig_1",
          slot: 123,
          memo,
          settlementTokenAccount: "SettlementAtaAddress",
          mint: "MintAddress",
          amountBaseUnits: "5000000",
        },
      ],
    });

    const updateOrderStatus = vi.fn(() => Promise.resolve());
    const result = await handleQuickNodeWebhook(
      { securityToken, updateOrderStatus },
      request,
    );

    expect(result.processedOrderIds).toEqual(["ord_777"]);
    expect(result.skipped).toEqual([]);
    expect(updateOrderStatus).toHaveBeenCalledTimes(1);
    expect(updateOrderStatus).toHaveBeenCalledWith(
      {
        orderId: "ord_777",
        signature: "sig_1",
        amountBaseUnits: 5_000_000n,
        slot: 123,
      },
      "paid",
    );
  });

  it("rejects a tampered payload and never calls updateOrderStatus", async () => {
    const memo = buildPaymentMemo("ord_888", "nonceB");
    const request = buildRequest({
      confirmedTransfers: [
        {
          signature: "sig_2",
          slot: 456,
          memo,
          settlementTokenAccount: "SettlementAtaAddress",
          mint: "MintAddress",
          amountBaseUnits: "1000000",
        },
      ],
    });

    // Tamper with the body after signing, without recomputing the signature —
    // exactly what an attacker replaying/modifying a captured delivery would do.
    const tamperedRequest = {
      ...request,
      rawBody: request.rawBody.replace('"1000000"', '"999999999"'),
    };

    const updateOrderStatus = vi.fn(() => Promise.resolve());

    await expect(
      handleQuickNodeWebhook({ securityToken, updateOrderStatus }, tamperedRequest),
    ).rejects.toBeInstanceOf(WebhookSignatureVerificationError);

    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it("rejects an unsigned request (missing headers) and never calls updateOrderStatus", async () => {
    const memo = buildPaymentMemo("ord_999", "nonceC");
    const payload: QuickNodeWebhookPayload = {
      confirmedTransfers: [
        {
          signature: "sig_3",
          slot: 1,
          memo,
          settlementTokenAccount: "SettlementAtaAddress",
          mint: "MintAddress",
          amountBaseUnits: "1000000",
        },
      ],
    };

    const updateOrderStatus = vi.fn(() => Promise.resolve());

    await expect(
      handleQuickNodeWebhook(
        { securityToken, updateOrderStatus },
        { headers: {}, rawBody: JSON.stringify(payload) },
      ),
    ).rejects.toBeInstanceOf(WebhookSignatureVerificationError);

    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it("rejects a signature that doesn't match the security token", async () => {
    const memo = buildPaymentMemo("ord_1", "nonceD");
    const rawBody = JSON.stringify({
      confirmedTransfers: [
        {
          signature: "sig_4",
          slot: 1,
          memo,
          settlementTokenAccount: "SettlementAtaAddress",
          mint: "MintAddress",
          amountBaseUnits: "1000000",
        },
      ],
    });
    const updateOrderStatus = vi.fn(() => Promise.resolve());

    await expect(
      handleQuickNodeWebhook(
        { securityToken, updateOrderStatus },
        {
          headers: {
            "x-qn-nonce": "n1",
            "x-qn-timestamp": "100",
            "x-qn-signature": "deadbeef".repeat(8),
          },
          rawBody,
        },
      ),
    ).rejects.toBeInstanceOf(WebhookSignatureVerificationError);

    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it("skips verified transfers whose memo doesn't match an order, without throwing", async () => {
    const request = buildRequest({
      confirmedTransfers: [
        {
          signature: "sig_5",
          slot: 1,
          memo: "not-an-advertek-memo",
          settlementTokenAccount: "SettlementAtaAddress",
          mint: "MintAddress",
          amountBaseUnits: "1000000",
        },
      ],
    });
    const updateOrderStatus = vi.fn(() => Promise.resolve());

    const result = await handleQuickNodeWebhook(
      { securityToken, updateOrderStatus },
      request,
    );

    expect(result.processedOrderIds).toEqual([]);
    expect(result.skipped).toEqual([
      {
        memo: "not-an-advertek-memo",
        reason: "memo does not match the advertek:order:{orderId}:{nonce} format",
      },
    ]);
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it("rejects a verified but schema-invalid payload", async () => {
    const nonce = "nonce-x";
    const timestamp = "1732000001";
    const rawBody = JSON.stringify({ confirmedTransfers: [{ oops: true }] });
    const signature = signBody(nonce, timestamp, rawBody);
    const updateOrderStatus = vi.fn(() => Promise.resolve());

    await expect(
      handleQuickNodeWebhook(
        { securityToken, updateOrderStatus },
        {
          headers: {
            "x-qn-nonce": nonce,
            "x-qn-timestamp": timestamp,
            "x-qn-signature": signature,
          },
          rawBody,
        },
      ),
    ).rejects.toBeInstanceOf(WebhookPayloadValidationError);

    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it("processes multiple confirmed transfers in one delivery", async () => {
    const request = buildRequest({
      confirmedTransfers: [
        {
          signature: "sig_a",
          slot: 1,
          memo: buildPaymentMemo("ord_a", "n1"),
          settlementTokenAccount: "Ata",
          mint: "Mint",
          amountBaseUnits: "1000000",
        },
        {
          signature: "sig_b",
          slot: 2,
          memo: buildPaymentMemo("ord_b", "n2"),
          settlementTokenAccount: "Ata",
          mint: "Mint",
          amountBaseUnits: "2000000",
        },
      ],
    });
    const updateOrderStatus = vi.fn(() => Promise.resolve());

    const result = await handleQuickNodeWebhook(
      { securityToken, updateOrderStatus },
      request,
    );

    expect(result.processedOrderIds).toEqual(["ord_a", "ord_b"]);
    expect(updateOrderStatus).toHaveBeenCalledTimes(2);
  });
});
