import { describe, expect, it, vi } from "vitest";
import { createSweepScheduler } from "./scheduler.js";
import type { RunSweepResult } from "./sweep.js";

const swept: RunSweepResult = { swept: false, reason: "nothing to sweep" };

describe("createSweepScheduler", () => {
  it("runOnce invokes runSweep and reports the result via onResult", async () => {
    const runSweep = vi.fn(() => Promise.resolve(swept));
    const onResult = vi.fn();
    const scheduler = createSweepScheduler({ runSweep, intervalMs: 1000, onResult });

    const result = await scheduler.runOnce();

    expect(result).toBe(swept);
    expect(onResult).toHaveBeenCalledWith(swept);
  });

  it("runOnce surfaces errors via onError and rethrows", async () => {
    const error = new Error("okx down");
    const runSweep = vi.fn(() => Promise.reject(error));
    const onError = vi.fn();
    const scheduler = createSweepScheduler({ runSweep, intervalMs: 1000, onError });

    await expect(scheduler.runOnce()).rejects.toBe(error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("start schedules runSweep on the configured interval using injected timer functions", () => {
    const runSweep = vi.fn(() => Promise.resolve(swept));
    const scheduledCallbacks: (() => void)[] = [];
    const setIntervalFn = vi.fn((handler: () => void) => {
      scheduledCallbacks.push(handler);
      return 1 as unknown as ReturnType<typeof setInterval>;
    });
    const clearIntervalFn = vi.fn();

    const scheduler = createSweepScheduler({
      runSweep,
      intervalMs: 5000,
      setIntervalFn,
      clearIntervalFn,
    });

    scheduler.start();

    expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 5000);
    expect(runSweep).not.toHaveBeenCalled();

    scheduledCallbacks[0]?.();
    expect(runSweep).toHaveBeenCalledTimes(1);
  });

  it("start is a no-op if already started (only schedules once)", () => {
    const setIntervalFn = vi.fn(() => 1 as unknown as ReturnType<typeof setInterval>);
    const scheduler = createSweepScheduler({
      runSweep: () => Promise.resolve(swept),
      intervalMs: 5000,
      setIntervalFn,
      clearIntervalFn: vi.fn(),
    });

    scheduler.start();
    scheduler.start();

    expect(setIntervalFn).toHaveBeenCalledTimes(1);
  });

  it("stop clears the timer and start can be called again afterwards", () => {
    const setIntervalFn = vi.fn(() => 1 as unknown as ReturnType<typeof setInterval>);
    const clearIntervalFn = vi.fn();
    const scheduler = createSweepScheduler({
      runSweep: () => Promise.resolve(swept),
      intervalMs: 5000,
      setIntervalFn,
      clearIntervalFn,
    });

    scheduler.start();
    scheduler.stop();
    expect(clearIntervalFn).toHaveBeenCalledTimes(1);

    scheduler.stop();
    expect(clearIntervalFn).toHaveBeenCalledTimes(1);

    scheduler.start();
    expect(setIntervalFn).toHaveBeenCalledTimes(2);
  });
});
