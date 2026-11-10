import { getRequestIP, type H3Event } from 'h3';

export interface AiGuardConfig {
  rateLimitPerMinute: number;
  dailyLimit: number;
  maxConcurrentPerIp: number;
  maxConcurrentGlobal: number;
  maxTrackedIps?: number;
  now?: () => number;
}

export type AiGuardAcquireResult =
  | {
      ok: true;
      release: () => void;
    }
  | {
      ok: false;
      reason: 'concurrency' | 'rate-limit' | 'daily-limit';
      retryAfterSec: number;
      message: string;
    };

const WINDOW_MS = 60_000;
const DAY_MS = 86_400_000;

function getUtcDayKey(timestampMs: number): { dayKey: string; retryAfterSec: number } {
  const date = new Date(timestampMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dayKey = `${year}-${month}-${day}`;
  const nextMidnightMs = Date.UTC(year, date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0);
  const retryAfterSec = Math.max(1, Math.ceil((nextMidnightMs - timestampMs) / 1000));
  return { dayKey, retryAfterSec };
}

export function resolveClientIp(event: H3Event, trustProxy: boolean): string {
  const ip = getRequestIP(event, { xForwardedFor: trustProxy });
  return ip?.trim() || 'unknown';
}

export function createAiGuard(config: AiGuardConfig) {
  const now = config.now ?? (() => Date.now());
  const maxTrackedIps = Math.max(64, config.maxTrackedIps ?? 2000);

  const ipWindows = new Map<string, { windowStartMs: number; count: number }>();
  const ipInFlight = new Map<string, number>();
  let globalInFlight = 0;
  let dailyDayKey = '';
  let dailyCount = 0;

  function pruneWindows(currentMs: number) {
    for (const [key, entry] of ipWindows) {
      if (currentMs - entry.windowStartMs >= WINDOW_MS) {
        ipWindows.delete(key);
      }
    }
    if (ipWindows.size >= maxTrackedIps) {
      const overflow = ipWindows.size - Math.floor(maxTrackedIps / 2);
      let removed = 0;
      for (const key of ipWindows.keys()) {
        ipWindows.delete(key);
        removed++;
        if (removed >= overflow) break;
      }
    }
  }

  function acquire(ip: string): AiGuardAcquireResult {
    const safeIp = ip.trim() || 'unknown';
    const currentMs = now();

    const currentIpInFlight = ipInFlight.get(safeIp) ?? 0;
    if (globalInFlight >= config.maxConcurrentGlobal || currentIpInFlight >= config.maxConcurrentPerIp) {
      return {
        ok: false,
        reason: 'concurrency',
        retryAfterSec: 2,
        message: 'Предыдущий запрос к ассистенту еще обрабатывается. Подождите немного.',
      };
    }

    const { dayKey, retryAfterSec: dayRetrySec } = getUtcDayKey(currentMs);
    if (dayKey !== dailyDayKey) {
      dailyDayKey = dayKey;
      dailyCount = 0;
    }

    if (dailyCount >= config.dailyLimit) {
      return {
        ok: false,
        reason: 'daily-limit',
        retryAfterSec: Math.min(dayRetrySec, Math.ceil(DAY_MS / 1000)),
        message: 'Достигнут дневной лимит обращений к ассистенту. Попробуйте завтра.',
      };
    }

    let windowEntry = ipWindows.get(safeIp);
    if (!windowEntry || currentMs - windowEntry.windowStartMs >= WINDOW_MS) {
      if (!windowEntry && ipWindows.size >= maxTrackedIps) {
        pruneWindows(currentMs);
      }
      windowEntry = { windowStartMs: currentMs, count: 0 };
      ipWindows.set(safeIp, windowEntry);
    }

    if (windowEntry.count >= config.rateLimitPerMinute) {
      const retryAfterSec = Math.max(1, Math.ceil((windowEntry.windowStartMs + WINDOW_MS - currentMs) / 1000));
      return {
        ok: false,
        reason: 'rate-limit',
        retryAfterSec,
        message: 'Слишком много запросов к ассистенту. Повторите через минуту.',
      };
    }

    windowEntry.count += 1;
    dailyCount += 1;
    globalInFlight += 1;
    ipInFlight.set(safeIp, currentIpInFlight + 1);

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      globalInFlight = Math.max(0, globalInFlight - 1);
      const active = (ipInFlight.get(safeIp) ?? 1) - 1;
      if (active <= 0) ipInFlight.delete(safeIp);
      else ipInFlight.set(safeIp, active);
    };

    return { ok: true, release };
  }

  function getStats() {
    return {
      globalInFlight,
      activeIps: ipInFlight.size,
      dailyCount,
      trackedIps: ipWindows.size,
    };
  }

  return { acquire, getStats };
}
