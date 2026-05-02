// Sliding window rate limiter — resets on app restart (no backend required)
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CALLS = 5;

const callTimestamps: number[] = [];

export interface RateLimitResult {
  allowed: boolean;
  remainingCalls: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Remove timestamps outside the window
  while (callTimestamps.length > 0 && callTimestamps[0] < windowStart) {
    callTimestamps.shift();
  }

  if (callTimestamps.length >= MAX_CALLS) {
    const oldestInWindow = callTimestamps[0];
    const retryAfterSeconds = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
    return { allowed: false, remainingCalls: 0, retryAfterSeconds };
  }

  return {
    allowed: true,
    remainingCalls: MAX_CALLS - callTimestamps.length - 1,
    retryAfterSeconds: 0,
  };
}

export function recordCall(): void {
  callTimestamps.push(Date.now());
}
