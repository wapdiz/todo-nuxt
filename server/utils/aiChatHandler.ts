import { createError, defineEventHandler, getHeader, setHeader, type H3Event } from 'h3';
import {
  AI_BODY_READ_TIMEOUT_MS,
  AI_MAX_REQUEST_BYTES,
  parseAiChatRequest,
  parseAiChatResponse,
} from '../../shared/utils/aiChat';
import { readBoundedJsonBody } from './aiBody';
import { createAiGuard, resolveClientIp } from './aiRateLimit';

export interface AiChatRuntimeConfig {
  n8nWebhookUrl: string;
  n8nAuthHeaderName: string;
  n8nAuthHeaderValue: string;
  aiTrustProxy: boolean;
  aiRateLimitPerMinute: number;
  aiDailyRequestLimit: number;
  aiMaxConcurrentPerIp: number;
  aiMaxConcurrentGlobal: number;
}

const DEFAULT_GUARD_CONFIG = {
  rateLimitPerMinute: 12,
  dailyLimit: 200,
  maxConcurrentPerIp: 1,
  maxConcurrentGlobal: 4,
};

let sharedGuard: ReturnType<typeof createAiGuard> | null = null;
let sharedGuardKey = '';

function getAiGuard(config: AiChatRuntimeConfig) {
  const rateLimitPerMinute = Math.max(
    1,
    Number(config.aiRateLimitPerMinute) || DEFAULT_GUARD_CONFIG.rateLimitPerMinute,
  );
  const dailyLimit = Math.max(1, Number(config.aiDailyRequestLimit) || DEFAULT_GUARD_CONFIG.dailyLimit);
  const maxConcurrentPerIp = Math.max(
    1,
    Number(config.aiMaxConcurrentPerIp) || DEFAULT_GUARD_CONFIG.maxConcurrentPerIp,
  );
  const maxConcurrentGlobal = Math.max(
    maxConcurrentPerIp,
    Number(config.aiMaxConcurrentGlobal) || DEFAULT_GUARD_CONFIG.maxConcurrentGlobal,
  );
  const nextKey = `${rateLimitPerMinute}:${dailyLimit}:${maxConcurrentPerIp}:${maxConcurrentGlobal}`;

  if (!sharedGuard || sharedGuardKey !== nextKey) {
    sharedGuard = createAiGuard({
      rateLimitPerMinute,
      dailyLimit,
      maxConcurrentPerIp,
      maxConcurrentGlobal,
    });
    sharedGuardKey = nextKey;
  }

  return sharedGuard;
}

export interface AiChatHandlerDeps {
  fetchImpl?: typeof fetch;
  guard?: ReturnType<typeof createAiGuard>;
  getConfig: (event: H3Event) => AiChatRuntimeConfig;
}

export function createAiChatHandler(deps: AiChatHandlerDeps) {
  const fetchImpl = deps.fetchImpl ?? fetch;

  return defineEventHandler(async (event) => {
    const config = deps.getConfig(event);

    const webhookUrl = typeof config.n8nWebhookUrl === 'string' ? config.n8nWebhookUrl.trim() : '';
    const authHeaderName = typeof config.n8nAuthHeaderName === 'string' ? config.n8nAuthHeaderName.trim() : '';
    const authHeaderValue = typeof config.n8nAuthHeaderValue === 'string' ? config.n8nAuthHeaderValue.trim() : '';

    if (!webhookUrl || !authHeaderName || !authHeaderValue) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Service Unavailable',
        message: 'ИИ-ассистент не настроен на сервере.',
      });
    }

    // Ограничиваем очевидные слишком крупные запросы до захвата слота и чтения потока.
    const rawLength = getHeader(event, 'content-length')?.trim();
    if (rawLength && /^\d+$/.test(rawLength) && Number(rawLength) > AI_MAX_REQUEST_BYTES) {
      setHeader(event, 'connection', 'close');
      throw createError({
        statusCode: 413,
        statusMessage: 'Payload Too Large',
        message: 'Размер запроса превышает допустимый предел.',
      });
    }

    const guard = deps.guard ?? getAiGuard(config);
    const clientIp = resolveClientIp(event, Boolean(config.aiTrustProxy));
    const slot = guard.acquire(clientIp);

    if (!slot.ok) {
      setHeader(event, 'retry-after', slot.retryAfterSec);
      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        message: slot.message,
      });
    }

    try {
      const rawBody = await readBoundedJsonBody(event, {
        maxBytes: AI_MAX_REQUEST_BYTES,
        timeoutMs: AI_BODY_READ_TIMEOUT_MS,
      });

      const payload = parseAiChatRequest(rawBody);
      if (!payload) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: 'Некорректные данные запроса к ассистенту.',
        });
      }

      let upstreamResponse: Response;
      try {
        upstreamResponse = await fetchImpl(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [authHeaderName]: authHeaderValue,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20_000),
        });
      } catch (err: unknown) {
        const isTimeout = err instanceof Error && err.name === 'TimeoutError';
        throw createError({
          statusCode: isTimeout ? 504 : 502,
          statusMessage: isTimeout ? 'Gateway Timeout' : 'Bad Gateway',
          message: isTimeout
            ? 'Ассистент не успел ответить вовремя. Попробуйте еще раз.'
            : 'Не удалось связаться с сервисом ассистента.',
        });
      }

      if (!upstreamResponse.ok) {
        throw createError({
          statusCode: 502,
          statusMessage: 'Bad Gateway',
          message: 'Сервис ассистента временно недоступен.',
        });
      }

      let rawUpstream: unknown;
      try {
        const text = await upstreamResponse.text();
        rawUpstream = text ? JSON.parse(text) : null;
      } catch {
        throw createError({
          statusCode: 502,
          statusMessage: 'Bad Gateway',
          message: 'Получен некорректный ответ от ассистента.',
        });
      }

      return parseAiChatResponse(rawUpstream, payload.activeDate);
    } finally {
      slot.release();
    }
  });
}
