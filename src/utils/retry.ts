export interface RetryOptions {
  readonly maxAttempts?: number;
  readonly initialDelayMs?: number;
  readonly timeoutMs?: number;
}

const DEFAULT: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1_000,
  timeoutMs: 60_000,
};

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  // Anthropic 429 (rate limit), 529 (overloaded), 500 (server error)
  return /429|529|500|rate.?limit|overload|timeout|econnreset|enotfound/.test(msg);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxAttempts, initialDelayMs, timeoutMs } = { ...DEFAULT, ...opts };

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`AI call timed out after ${timeoutMs}ms`)), timeoutMs),
    );

    try {
      return await Promise.race([fn(), timeout]);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !isRetryable(err)) break;
      await delay(initialDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}
