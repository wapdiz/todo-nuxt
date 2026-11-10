import { createError, defineEventHandler, getHeader, setHeader, type H3Event } from 'h3';
import {
  AI_BODY_READ_TIMEOUT_MS,
  AI_MAX_REQUEST_BYTES,
  parseAiChatRequest,
  parseAiChatResponse,
} from '../../shared/utils/aiChat';
import { readBoundedJsonBody } from './aiBody';
import type { AiGuardRuntimeConfig, createAiGuard } from './aiRateLimit';
import { getSharedAiGuard, resolveClientIp } from './aiRateLimit';

export interface AiChatRuntimeConfig extends AiGuardRuntimeConfig {
  n8nWebhookUrl: string;
  n8nAuthHeaderName: string;
  n8nAuthHeaderValue: string;
  aiTrustProxy: boolean;
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

    const guard = deps.guard ?? getSharedAiGuard(config);
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

      const quota = slot.reserveDailyQuota();
      if (!quota.ok) {
        setHeader(event, 'retry-after', quota.retryAfterSec);
        throw createError({
          statusCode: 429,
          statusMessage: 'Too Many Requests',
          message: quota.message,
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
