import { describe, expect, it } from "vitest";
import {
  createPostgresWebhookSubscriptionLookup,
  WebhookSubscriptionNotFoundError,
} from "./subscriptions.js";
import { createFakeExecutor, lastQuery } from "./test-utils.js";

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
