import AsyncStorage from '@react-native-async-storage/async-storage';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_CALLS = 5;
const STORAGE_KEY = '@rate_limit_timestamps';

export interface RateLimitResult {
  allowed: boolean;
  remainingCalls: number;
  retryAfterSeconds: number;
}

async function loadTimestamps(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveTimestamps(timestamps: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timestamps));
  } catch {
    // Storage failure is non-fatal — rate limit still works in-memory this session
  }
}

export async function checkRateLimit(): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const all = await loadTimestamps();
  const recent = all.filter((t) => t >= windowStart);

  if (recent.length >= MAX_CALLS) {
    const retryAfterSeconds = Math.ceil((recent[0] + WINDOW_MS - now) / 1000);
    return { allowed: false, remainingCalls: 0, retryAfterSeconds };
  }

  return {
    allowed: true,
    remainingCalls: MAX_CALLS - recent.length - 1,
    retryAfterSeconds: 0,
  };
}

export async function recordCall(): Promise<void> {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const all = await loadTimestamps();
  const recent = all.filter((t) => t >= windowStart);
  await saveTimestamps([...recent, now]);
}
