import type { RunSweepResult } from "./sweep.js";

export interface SweepSchedulerDeps {
  readonly runSweep: () => Promise<RunSweepResult>;
  readonly intervalMs: number;
  readonly onResult?: (result: RunSweepResult) => void;
  readonly onError?: (error: unknown) => void;
  readonly setIntervalFn?: (handler: () => void, ms: number) => ReturnType<typeof setInterval>;
  readonly clearIntervalFn?: (handle: ReturnType<typeof setInterval>) => void;
}

export interface SweepScheduler {
  /** Starts the recurring schedule. No-op if already started. */
  start(): void;
  /** Stops the recurring schedule. No-op if already stopped. */
  stop(): void;
  /** Runs the sweep once, outside the schedule (e.g. for manual/ops triggers). */
  runOnce(): Promise<RunSweepResult>;
}

/** Runs `runSweep` on a defined interval, per the sweep-schedule requirement. */
export function createSweepScheduler(deps: SweepSchedulerDeps): SweepScheduler {
  const setIntervalFn = deps.setIntervalFn ?? setInterval;
  const clearIntervalFn = deps.clearIntervalFn ?? clearInterval;
  let timer: ReturnType<typeof setInterval> | undefined;

  const runOnce = async (): Promise<RunSweepResult> => {
    try {
      const result = await deps.runSweep();
      deps.onResult?.(result);
      return result;
    } catch (error) {
      deps.onError?.(error);
      throw error;
    }
  };

  return {
    runOnce,
    start() {
      if (timer !== undefined) {
        return;
      }
      timer = setIntervalFn(() => {
        runOnce().catch(() => {
          // Already surfaced via onError; swallow here so the interval keeps running.
        });
      }, deps.intervalMs);
    },
    stop() {
      if (timer === undefined) {
        return;
      }
      clearIntervalFn(timer);
      timer = undefined;
    },
  };
}
