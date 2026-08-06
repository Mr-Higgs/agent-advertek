import { describe, expect, it, vi } from "vitest";
import {
  AdvertekWebhookAuthError,
  AdvertekWebhookPayloadValidationError,
  handleAdvertekWebhook,
  verifyAdvertekWebhookBasicAuth,
  type AdvertekWebhookEvent,
} from "./advertek-webhook.js";

const credentials = { username: "advertek", password: "s3cret" };

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

const validAuthHeader = basicAuthHeader(credentials.username, credentials.password);

const stagingShapedBody = JSON.stringify({
  id: "adv-order-9001",
  status: "shipped",
  metadata: { internal_order_id: "order-123", internal_item_id: "item-1" },
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

describe("verifyAdvertekWebhookBasicAuth", () => {
  it("accepts a correctly-encoded matching header", () => {
    expect(verifyAdvertekWebhookBasicAuth(validAuthHeader, credentials)).toBe(true);
  });

  it("rejects a missing header", () => {
    expect(verifyAdvertekWebhookBasicAuth(undefined, credentials)).toBe(false);
  });

  it("rejects a non-Basic scheme", () => {
    expect(verifyAdvertekWebhookBasicAuth("Bearer sometoken", credentials)).toBe(false);
  });

  it("rejects a wrong password", () => {
    expect(
      verifyAdvertekWebhookBasicAuth(
        basicAuthHeader(credentials.username, "wrong-password"),
        credentials,
      ),
    ).toBe(false);
  });

  it("rejects a wrong username", () => {
    expect(
      verifyAdvertekWebhookBasicAuth(
        basicAuthHeader("someone-else", credentials.password),
        credentials,
      ),
    ).toBe(false);
  });

  it("rejects a malformed (non-base64) credential blob", () => {
    expect(verifyAdvertekWebhookBasicAuth("Basic ###not-base64###", credentials)).toBe(false);
  });
});

describe("handleAdvertekWebhook", () => {
  it("returns a mapped event and never throws for a valid, authenticated staging-shaped payload", () => {
    const dispatch = vi.fn((): Promise<void> => Promise.resolve());
    const receivedAt = new Date("2026-08-06T18:00:00.000Z");

    const event = handleAdvertekWebhook(
      { credentials, dispatch, now: () => receivedAt },
      { authorizationHeader: validAuthHeader, rawBody: stagingShapedBody },
    );

    expect(event).toEqual({
      vendorOrderId: "adv-order-9001",
      internalOrderId: "order-123",
      vendorStatus: "shipped",
      orderStatus: "shipped",
      packages: [
        {
          id: "pkg-1",
          tracking_name: "Box 1 of 1",
          aftership_slug: "ups",
          tracking_code: "1Z999AA10123456784",
          tracking_url: "https://track.aftership.com/ups/1Z999AA10123456784",
        },
      ],
      receivedAt,
    });
  });

  it("maps held and failed to their own explicit orderStatus values", () => {
    for (const [vendorStatus, expectedOrderStatus] of [
      ["held", "held"],
      ["failed", "failed"],
    ] as const) {
      const body = JSON.stringify({
        id: "adv-order-1",
        status: vendorStatus,
        metadata: { internal_order_id: "order-1" },
      });
      const dispatch = vi.fn((): Promise<void> => Promise.resolve());

      const event = handleAdvertekWebhook(
        { credentials, dispatch },
        { authorizationHeader: validAuthHeader, rawBody: body },
      );

      expect(event.orderStatus).toBe(expectedOrderStatus);
    }
  });

  it("rejects an unauthenticated request and never calls dispatch", () => {
    const dispatch = vi.fn((): Promise<void> => Promise.resolve());

    expect(() =>
      handleAdvertekWebhook(
        { credentials, dispatch },
        { authorizationHeader: undefined, rawBody: stagingShapedBody },
      ),
    ).toThrow(AdvertekWebhookAuthError);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects a request with wrong credentials and never calls dispatch", () => {
    const dispatch = vi.fn((): Promise<void> => Promise.resolve());

    expect(() =>
      handleAdvertekWebhook(
        { credentials, dispatch },
        {
          authorizationHeader: basicAuthHeader("wrong", "creds"),
          rawBody: stagingShapedBody,
        },
      ),
    ).toThrow(AdvertekWebhookAuthError);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON and never calls dispatch", () => {
    const dispatch = vi.fn((): Promise<void> => Promise.resolve());

    expect(() =>
      handleAdvertekWebhook(
        { credentials, dispatch },
        { authorizationHeader: validAuthHeader, rawBody: "{not json" },
      ),
    ).toThrow(AdvertekWebhookPayloadValidationError);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects a payload using the earlier assumed status set and never calls dispatch", () => {
    const dispatch = vi.fn((): Promise<void> => Promise.resolve());
    const body = JSON.stringify({
      id: "adv-order-1",
      status: "accepted",
      metadata: { internal_order_id: "order-1" },
    });

    expect(() =>
      handleAdvertekWebhook(
        { credentials, dispatch },
        { authorizationHeader: validAuthHeader, rawBody: body },
      ),
    ).toThrow(AdvertekWebhookPayloadValidationError);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects a payload whose metadata is missing internal_order_id and never calls dispatch", () => {
    const dispatch = vi.fn((): Promise<void> => Promise.resolve());
    const body = JSON.stringify({
      id: "adv-order-1",
      status: "shipped",
      metadata: { some_other_key: "x" },
    });

    expect(() =>
      handleAdvertekWebhook(
        { credentials, dispatch },
        { authorizationHeader: validAuthHeader, rawBody: body },
      ),
    ).toThrow(AdvertekWebhookPayloadValidationError);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("returns before a slow dispatch resolves, then still eventually calls it", async () => {
    let dispatchResolved = false;
    const dispatch = vi.fn(
      (): Promise<void> =>
        new Promise((resolve) => {
          setTimeout(() => {
            dispatchResolved = true;
            resolve();
          }, 50);
        }),
    );

    const event = handleAdvertekWebhook(
      { credentials, dispatch },
      { authorizationHeader: validAuthHeader, rawBody: stagingShapedBody },
    );

    // The function already returned synchronously above — dispatch cannot
    // have resolved yet, proving the slow work never delayed the return.
    expect(dispatchResolved).toBe(false);
    expect(event.internalOrderId).toBe("order-123");

    await vi.waitFor(() => {
      expect(dispatchResolved).toBe(true);
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("routes a dispatch rejection to onDispatchError instead of throwing", async () => {
    const dispatchError = new Error("agent webhook target unreachable");
    const dispatch = vi.fn((): Promise<void> => Promise.reject(dispatchError));
    const onDispatchError = vi.fn();

    let capturedEvent: AdvertekWebhookEvent | undefined;
    expect(() => {
      capturedEvent = handleAdvertekWebhook(
        { credentials, dispatch, onDispatchError },
        { authorizationHeader: validAuthHeader, rawBody: stagingShapedBody },
      );
    }).not.toThrow();

    await vi.waitFor(() => {
      expect(onDispatchError).toHaveBeenCalledTimes(1);
    });
    expect(onDispatchError).toHaveBeenCalledWith(dispatchError, capturedEvent);
  });
});
