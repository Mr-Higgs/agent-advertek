import { describe, expect, it } from "vitest";
import { bridgeAdvertekStatusToOrderStatus } from "./status-bridge.js";

describe("bridgeAdvertekStatusToOrderStatus", () => {
  it("maps downloaded to its own distinct status, not a generic in-production bucket", () => {
    expect(bridgeAdvertekStatusToOrderStatus("downloaded")).toBe("downloaded");
  });

  it("maps printing to its own distinct status", () => {
    expect(bridgeAdvertekStatusToOrderStatus("printing")).toBe("printing");
  });

  it("maps printed to its own distinct status", () => {
    expect(bridgeAdvertekStatusToOrderStatus("printed")).toBe("printed");
  });

  it("maps shipped to shipped", () => {
    expect(bridgeAdvertekStatusToOrderStatus("shipped")).toBe("shipped");
  });

  it("maps delivered to completed", () => {
    expect(bridgeAdvertekStatusToOrderStatus("delivered")).toBe("completed");
  });

  it("maps held to its own explicit status rather than dropping or aliasing it to cancelled", () => {
    expect(bridgeAdvertekStatusToOrderStatus("held")).toBe("held");
  });

  it("maps cancelled to cancelled", () => {
    expect(bridgeAdvertekStatusToOrderStatus("cancelled")).toBe("cancelled");
  });

  it("maps failed to its own explicit status rather than dropping or aliasing it to cancelled", () => {
    expect(bridgeAdvertekStatusToOrderStatus("failed")).toBe("failed");
  });

  it("is a total mapping — every real vendor status resolves to a defined OrderStatus", () => {
    const vendorStatuses = [
      "downloaded",
      "printing",
      "printed",
      "shipped",
      "delivered",
      "held",
      "cancelled",
      "failed",
    ] as const;

    for (const status of vendorStatuses) {
      expect(bridgeAdvertekStatusToOrderStatus(status)).toBeDefined();
    }
  });
});
