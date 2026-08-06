import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdvertekWebhookRequestHandler } from "./advertek-webhook-http.js";

const credentials = { username: "advertek", password: "s3cret" };
const validAuthHeader = `Basic ${Buffer.from(
  `${credentials.username}:${credentials.password}`,
  "utf8",
).toString("base64")}`;

const stagingShapedBody = JSON.stringify({
  id: "adv-order-9001",
  status: "printed",
  metadata: { internal_order_id: "order-123" },
  packages: [],
});

describe("createAdvertekWebhookRequestHandler (end-to-end over HTTP)", () => {
  let server: Server;
  let baseUrl: string;
  let dispatch: ReturnType<typeof vi.fn>;
  let onDispatchError: ReturnType<typeof vi.fn>;

  function start(): void {
    const handler = createAdvertekWebhookRequestHandler({
      credentials,
      dispatch,
      onDispatchError,
    });
    server = createServer((req, res) => {
      void handler(req, res);
    });
  }

  beforeEach(() => {
    dispatch = vi.fn((): Promise<void> => Promise.resolve());
    onDispatchError = vi.fn();
  });

  async function listen(): Promise<void> {
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected server to bind to a TCP address");
    }
    baseUrl = `http://127.0.0.1:${String(address.port)}`;
  }

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  it("returns 200 with staging-shaped, real-status, packages-populated payload behind a TLS-terminating proxy", async () => {
    start();
    await listen();

    const populatedBody = JSON.stringify({
      id: "adv-order-9001",
      status: "shipped",
      metadata: { internal_order_id: "order-123" },
      packages: [
        {
          id: "pkg-1",
          tracking_name: "Box 1 of 1",
          aftership_slug: "ups",
          tracking_code: "1Z999AA10123456784",
          tracking_url: "https://track.aftership.com/ups/1Z999AA10123456784",
        },
      ],
    });

    const response = await fetch(`${baseUrl}/webhooks/advertek`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: validAuthHeader,
        "x-forwarded-proto": "https",
      },
      body: populatedBody,
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      ok: boolean;
      vendorOrderId: string;
      internalOrderId: string;
    };
    expect(json).toEqual({
      ok: true,
      vendorOrderId: "adv-order-9001",
      internalOrderId: "order-123",
    });
    await vi.waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });

  it("rejects a request not proven to have arrived over HTTPS, before touching auth or the body", async () => {
    start();
    await listen();

    const response = await fetch(`${baseUrl}/webhooks/advertek`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: validAuthHeader },
      body: stagingShapedBody,
    });

    expect(response.status).toBe(400);
    const json = (await response.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/HTTPS/);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects a missing/wrong Basic Auth credential with 401 and never dispatches", async () => {
    start();
    await listen();

    const response = await fetch(`${baseUrl}/webhooks/advertek`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-proto": "https",
        authorization: `Basic ${Buffer.from("wrong:creds", "utf8").toString("base64")}`,
      },
      body: stagingShapedBody,
    });

    expect(response.status).toBe(401);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects a payload using the earlier assumed status set with 400", async () => {
    start();
    await listen();

    const response = await fetch(`${baseUrl}/webhooks/advertek`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-proto": "https",
        authorization: validAuthHeader,
      },
      body: JSON.stringify({
        id: "adv-order-1",
        status: "accepted",
        metadata: { internal_order_id: "order-1" },
      }),
    });

    expect(response.status).toBe(400);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("acknowledges with 2xx quickly even when downstream dispatch is slow", async () => {
    dispatch = vi.fn(
      (): Promise<void> =>
        new Promise((resolve) => {
          setTimeout(resolve, 300);
        }),
    );
    start();
    await listen();

    const startedAt = Date.now();
    const response = await fetch(`${baseUrl}/webhooks/advertek`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-proto": "https",
        authorization: validAuthHeader,
      },
      body: stagingShapedBody,
    });
    const elapsedMs = Date.now() - startedAt;

    expect(response.status).toBe(200);
    // Well under the slow dispatch's 300ms, proving the response did not
    // wait on it — Advertek's contract requires a 2xx within 10s.
    expect(elapsedMs).toBeLessThan(200);

    await vi.waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });

  it("acknowledges with 2xx even when downstream dispatch fails", async () => {
    const dispatchError = new Error("agent webhook target unreachable");
    dispatch = vi.fn((): Promise<void> => Promise.reject(dispatchError));
    start();
    await listen();

    const response = await fetch(`${baseUrl}/webhooks/advertek`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-proto": "https",
        authorization: validAuthHeader,
      },
      body: stagingShapedBody,
    });

    expect(response.status).toBe(200);
    await vi.waitFor(() => {
      expect(onDispatchError).toHaveBeenCalledWith(dispatchError, expect.anything());
    });
  });
});
