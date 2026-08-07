import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  createPostgresWebhookSubscriptionLookup,
  createWebhookSubscription,
  WebhookSubscriptionNotFoundError,
} from "./subscriptions.js";
import { createFakeExecutor, lastQuery } from "./test-utils.js";

describe("createWebhookSubscription", () => {
  it("inserts the subscription row for the order", async () => {
    const executor = createFakeExecutor();

    await createWebhookSubscription(executor, {
      id: "sub_1",
      internalOrderId: "ord_1",
      targetUrl: "https://agent.example.com/hooks/advertek",
      signingSecretReference: "AGENT_WEBHOOK_SIGNING_SECRET",
    });

    const query = lastQuery(executor);
    expect(query.text).toContain("INSERT INTO webhook_subscriptions");
    expect(query.text).toContain(
      "(id, internal_order_id, target_url, signing_secret_reference)",
    );
    expect(query.params).toEqual([
      "sub_1",
      "ord_1",
      "https://agent.example.com/hooks/advertek",
      "AGENT_WEBHOOK_SIGNING_SECRET",
    ]);
  });

  it("rejects a non-URL target before touching the database", async () => {
    const executor = createFakeExecutor();

    await expect(
      createWebhookSubscription(executor, {
        id: "sub_1",
        internalOrderId: "ord_1",
        targetUrl: "not-a-url",
        signingSecretReference: "AGENT_WEBHOOK_SIGNING_SECRET",
      }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(executor.queries).toHaveLength(0);
  });
});

describe("createPostgresWebhookSubscriptionLookup", () => {
  it("maps the stored row to a WebhookSubscription", async () => {
    const executor = createFakeExecutor(() => [
      {
        id: "sub_1",
        target_url: "https://agent.example.com/hooks/advertek",
        signing_secret_reference: "AGENT_HOOK_SECRET_1",
      },
    ]);
    const lookup = createPostgresWebhookSubscriptionLookup(executor);

    const subscription = await lookup.getSubscriptionForOrder("ord_1");

    expect(subscription.id).toBe("sub_1");
    expect(subscription.targetUrl.href).toBe("https://agent.example.com/hooks/advertek");
    expect(subscription.signingSecretReference).toBe("AGENT_HOOK_SECRET_1");
    expect(lastQuery(executor).params).toEqual(["ord_1"]);
  });

  it("throws when no subscription exists for the order", async () => {
    const executor = createFakeExecutor(() => []);
    const lookup = createPostgresWebhookSubscriptionLookup(executor);

    await expect(lookup.getSubscriptionForOrder("ord_missing")).rejects.toBeInstanceOf(
      WebhookSubscriptionNotFoundError,
    );
  });
});
