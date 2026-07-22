import { describe, expect, it, vi } from "vitest";
import {
  RpcRetryExhaustedError,
  RpcTimeoutError,
  withRpcRetry,
} from "./rpc-retry.js";

describe("withRpcRetry", () => {
  it("returns on first success", async () => {
    const operation = vi.fn(() => Promise.resolve("ok"));
    await expect(
      withRpcRetry("probe", operation, {
        maxAttempts: 3,
        timeoutMs: 1_000,
        initialDelayMs: 1,
        maxDelayMs: 1,
      }),
    ).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries transient timeouts then succeeds", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new RpcTimeoutError("timed out"))
      .mockResolvedValueOnce("recovered");

    const sleep = vi.fn(() => Promise.resolve());

    await expect(
      withRpcRetry("probe", operation, {
        maxAttempts: 3,
        timeoutMs: 50,
        initialDelayMs: 5,
        maxDelayMs: 5,
        sleep,
      }),
    ).resolves.toBe("recovered");

    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("exhausts retries on persistent transient failures", async () => {
    const operation = vi.fn(() =>
      Promise.reject(new RpcTimeoutError("timed out")),
    );

    await expect(
      withRpcRetry("probe", operation, {
        maxAttempts: 3,
        timeoutMs: 20,
        initialDelayMs: 1,
        maxDelayMs: 1,
        sleep: () => Promise.resolve(),
      }),
    ).rejects.toBeInstanceOf(RpcRetryExhaustedError);

    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("times out a hung operation", async () => {
    try {
      await withRpcRetry(
        "hang",
        async () =>
          new Promise<string>(() => {
            /* never resolves */
          }),
        {
          maxAttempts: 1,
          timeoutMs: 20,
          initialDelayMs: 1,
          maxDelayMs: 1,
        },
      );
      throw new Error("expected timeout failure");
    } catch (error) {
      expect(error).toBeInstanceOf(RpcRetryExhaustedError);
      expect((error as RpcRetryExhaustedError).cause).toBeInstanceOf(
        RpcTimeoutError,
      );
    }
  });
});
