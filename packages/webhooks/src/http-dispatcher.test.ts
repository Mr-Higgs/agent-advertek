import { describe, expect, it, vi } from "vitest";
import {
  createHttpWebhookDispatcher,
  signWebhookBody,
  SIGNATURE_HEADER,
  WebhookDispatchError,
} from "./http-dispatcher.js";

const subscription = {
  id: "sub_1",
  targetUrl: new URL("https://agent.example.com/hooks/advertek"),
  signingSecretReference: "AGENT_HOOK_SECRET_1",
};

const event = {
  orderId: "ord_1",
  status: "printing" as const,
  occurredAt: new Date("2026-08-05T12:00:00.000Z"),
};

describe("createHttpWebhookDispatcher", () => {
  it("POSTs the status event with an HMAC signature header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const dispatcher = createHttpWebhookDispatcher({
      fetchImpl,
      resolveSecret: () => "s3cret",
    });

    await dispatcher.dispatch(subscription, event);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(url).toBe("https://agent.example.com/hooks/advertek");
    expect(init.body).toBe(
      JSON.stringify({
        orderId: "ord_1",
        status: "printing",
        occurredAt: "2026-08-05T12:00:00.000Z",
      }),
    );
    expect(init.headers[SIGNATURE_HEADER]).toBe(signWebhookBody("s3cret", init.body));
  });

  it("resolves the signing secret by reference, never embedding it", async () => {
    const resolveSecret = vi.fn().mockReturnValue("s3cret");
    const dispatcher = createHttpWebhookDispatcher({
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, status: 204 }),
      resolveSecret,
    });

    await dispatcher.dispatch(subscription, event);
    expect(resolveSecret).toHaveBeenCalledWith("AGENT_HOOK_SECRET_1");
  });

  it("throws WebhookDispatchError on non-2xx responses", async () => {
    const dispatcher = createHttpWebhookDispatcher({
      fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 500 }),
      resolveSecret: () => "s3cret",
    });

    await expect(dispatcher.dispatch(subscription, event)).rejects.toBeInstanceOf(
      WebhookDispatchError,
    );
  });

  it("rejects an invalid event before any HTTP call", async () => {
    const fetchImpl = vi.fn();
    const dispatcher = createHttpWebhookDispatcher({
      fetchImpl,
      resolveSecret: () => "s3cret",
    });

    await expect(
      dispatcher.dispatch(subscription, { ...event, status: "bogus" } as never),
    ).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
