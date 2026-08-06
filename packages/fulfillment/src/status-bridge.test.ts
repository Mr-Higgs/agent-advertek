import { describe, expect, it } from "vitest";
import { bridgeAdvertekStatusToOrderStatus } from "./status-bridge.js";

describe("bridgeAdvertekStatusToOrderStatus", () => {
  it("does not invent a mapping for the ambiguous 'accepted' status", () => {
    expect(bridgeAdvertekStatusToOrderStatus("accepted")).toBeUndefined();
  });

  it("maps shipped to shipped", () => {
    expect(bridgeAdvertekStatusToOrderStatus("shipped")).toBe("shipped");
  });

  it("maps cancelled to cancelled", () => {
    expect(bridgeAdvertekStatusToOrderStatus("cancelled")).toBe("cancelled");
  });

  it("maps cancelled_after_printing to cancelled", () => {
    expect(bridgeAdvertekStatusToOrderStatus("cancelled_after_printing")).toBe(
      "cancelled",
    );
  });

  it("never claims in-production or completed for any known vendor status", () => {
    const vendorStatuses = [
      "accepted",
      "shipped",
      "cancelled",
      "cancelled_after_printing",
    ] as const;

    for (const status of vendorStatuses) {
      const mapped = bridgeAdvertekStatusToOrderStatus(status);
      expect(mapped).not.toBe("in-production");
      expect(mapped).not.toBe("completed");
    }
  });
});
