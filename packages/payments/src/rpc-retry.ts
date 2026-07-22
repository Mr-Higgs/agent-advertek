export class RpcTimeoutError extends Error {
  override readonly name = "RpcTimeoutError";

  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
  }
}

export class RpcRetryExhaustedError extends Error {
  override readonly name = "RpcRetryExhaustedError";

  constructor(
    message: string,
    readonly attempts: number,
    override readonly cause?: unknown,
  ) {
    super(message);
  }
}

export interface RetryOptions {
  readonly maxAttempts: number;
  readonly timeoutMs: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly signal?: AbortSignal;
  readonly isRetryable?: (error: unknown) => boolean;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
}

const defaultSleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export function isTransientRpcError(error: unknown): boolean {
  if (error instanceof RpcTimeoutError) {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("econnreset") ||
      message.includes("429") ||
      message.includes("503") ||
      message.includes("502") ||
      message.includes("504")
    );
  }
  return false;
}

export async function withRpcRetry<T>(
  operationName: string,
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  const isRetryable = options.isRetryable ?? isTransientRpcError;
  let delayMs = options.initialDelayMs;
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    if (options.signal?.aborted) {
      throw new Error(`${operationName} aborted`);
    }

    try {
      return await withTimeout(
        operationName,
        operation(attempt),
        options.timeoutMs,
        options.signal,
      );
    } catch (error) {
      lastError = error;
      const canRetry =
        attempt < options.maxAttempts && isRetryable(error) && !options.signal?.aborted;
      if (!canRetry) {
        break;
      }
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, options.maxDelayMs);
    }
  }

  throw new RpcRetryExhaustedError(
    `${operationName} failed after ${String(options.maxAttempts)} attempts`,
    options.maxAttempts,
    lastError,
  );
}

async function withTimeout<T>(
  operationName: string,
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new RpcTimeoutError(
              `${operationName} timed out after ${String(timeoutMs)}ms`,
            ),
          );
        }, timeoutMs);

        if (signal) {
          onAbort = () => {
            reject(new Error(`${operationName} aborted`));
          };
          signal.addEventListener("abort", onAbort, { once: true });
        }
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (signal && onAbort) {
      signal.removeEventListener("abort", onAbort);
    }
  }
}
