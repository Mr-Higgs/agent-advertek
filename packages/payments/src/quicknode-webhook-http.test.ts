import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPaymentMemo } from "./payment-request.js";
import { createQuickNodeWebhookRequestHandler } from "./quicknode-webhook-http.js";

const securityToken = "http-test-security-token";

function sign(nonce: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", securityToken)
    .update(nonce + timestamp + rawBody, "utf8")
    .digest("hex");
}

describe("createQuickNodeWebhookRequestHandler (end-to-end over HTTP)", () => {
  let server: Server;
  let baseUrl: string;
  let updateOrderStatus: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    updateOrderStatus = vi.fn(() => Promise.resolve());
    const handler = createQuickNodeWebhookRequestHandler({
      securityToken,
      updateOrderStatus,
    });
    server = createServer((req, res) => {
      void handler(req, res);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected server to bind to a TCP address");
    }
    baseUrl = `http://127.0.0.1:${String(address.port)}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  it("returns 200 and updates order status for a genuinely signed delivery", async () => {
    const memo = buildPaymentMemo("ord_live_1", "n1");
    const rawBody = JSON.stringify({
      confirmedTransfers: [
        {
          signature: "sig_ok",
          slot: 1,
          memo,
          settlementTokenAccount: "Ata",
          mint: "Mint",
          amountBaseUnits: "1000000",
        },
      ],
    });
    const nonce = "n-ok";
    const timestamp = "1732000010";

    const response = await fetch(`${baseUrl}/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-qn-nonce": nonce,
        "x-qn-timestamp": timestamp,
        "x-qn-signature": sign(nonce, timestamp, rawBody),
      },
      body: rawBody,
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok: boolean; processedOrderIds: string[] };
    expect(json).toEqual({ ok: true, processedOrderIds: ["ord_live_1"] });
    expect(updateOrderStatus).toHaveBeenCalledTimes(1);
  });

  it("rejects a deliberately unsigned request with 401 and never updates order status", async () => {
    const memo = buildPaymentMemo("ord_live_2", "n2");
    const rawBody = JSON.stringify({
      confirmedTransfers: [
        {
          signature: "sig_unsigned",
          slot: 2,
          memo,
          settlementTokenAccount: "Ata",
          mint: "Mint",
          amountBaseUnits: "1000000",
        },
      ],
    });

    // No x-qn-* headers at all — an unsigned delivery.
    const response = await fetch(`${baseUrl}/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: rawBody,
    });

    expect(response.status).toBe(401);
    const json = (await response.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it("rejects a deliberately tampered request with 401 and never updates order status", async () => {
    const memo = buildPaymentMemo("ord_live_3", "n3");
    const signedBody = JSON.stringify({
      confirmedTransfers: [
        {
          signature: "sig_tampered",
          slot: 3,
          memo,
          settlementTokenAccount: "Ata",
          mint: "Mint",
          amountBaseUnits: "1000000",
        },
      ],
    });
    const nonce = "n-tampered";
    const timestamp = "1732000020";
    const validSignature = sign(nonce, timestamp, signedBody);

    // Attacker bumps the amount after the signature was computed, without
    // access to the security token needed to re-sign it.
    const tamperedBody = signedBody.replace('"1000000"', '"999999999"');

    const response = await fetch(`${baseUrl}/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-qn-nonce": nonce,
        "x-qn-timestamp": timestamp,
        "x-qn-signature": validSignature,
      },
      body: tamperedBody,
    });

    expect(response.status).toBe(401);
    const json = (await response.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });
});
