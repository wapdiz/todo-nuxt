import { createError, defineEventHandler, getHeader, setHeader, type H3Event } from 'h3';
import type { N8nTranscribeWebhookPayload } from '../../shared/types/aiTranscribe';
import {
  AI_TRANSCRIBE_BODY_TIMEOUT_MS,
  AI_TRANSCRIBE_MAX_REQUEST_BYTES,
  AI_TRANSCRIBE_UPSTREAM_TIMEOUT_MS,
  parseAiTranscribeRequest,
  parseAiTranscribeResponse,
} from '../../shared/utils/aiTranscribe';
import { readBoundedJsonBody } from './aiBody';
import type { AiChatRuntimeConfig } from './aiChatHandler';
import type { createAiGuard } from './aiRateLimit';
import { getSharedAiGuard, resolveClientIp } from './aiRateLimit';

export interface AiTranscribeHandlerDeps {
  fetchImpl?: typeof fetch;
  guard?: ReturnType<typeof createAiGuard>;
  getConfig: (event: H3Event) => AiChatRuntimeConfig;
}

export function createAiTranscribeHandler(deps: AiTranscribeHandlerDeps) {
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
        message: 'Распознавание речи не настроено на сервере.',
      });
    }

    const rawLength = getHeader(event, 'content-length')?.trim();
    if (rawLength && /^\d+$/.test(rawLength) && Number(rawLength) > AI_TRANSCRIBE_MAX_REQUEST_BYTES) {
      setHeader(event, 'connection', 'close');
      throw createError({
        statusCode: 413,
        statusMessage: 'Payload Too Large',
        message: 'Аудиозапись слишком большая. Попробуйте записать более короткий фрагмент.',
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
        maxBytes: AI_TRANSCRIBE_MAX_REQUEST_BYTES,
        timeoutMs: AI_TRANSCRIBE_BODY_TIMEOUT_MS,
      });

      const payload = parseAiTranscribeRequest(rawBody);
      if (!payload) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: 'Некорректные аудиоданные для распознавания.',
        });
      }

      const webhookBody: N8nTranscribeWebhookPayload = {
        action: 'transcribe',
        input_audio: {
          data: payload.audioBase64,
          format: payload.format,
        },
      };

      let upstreamResponse: Response;
      try {
        upstreamResponse = await fetchImpl(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [authHeaderName]: authHeaderValue,
          },
          body: JSON.stringify(webhookBody),
          signal: AbortSignal.timeout(AI_TRANSCRIBE_UPSTREAM_TIMEOUT_MS),
        });
      } catch (err: unknown) {
        const isTimeout = err instanceof Error && err.name === 'TimeoutError';
        throw createError({
          statusCode: isTimeout ? 504 : 502,
          statusMessage: isTimeout ? 'Gateway Timeout' : 'Bad Gateway',
          message: isTimeout
            ? 'Распознавание речи заняло слишком много времени. Попробуйте записать короче.'
            : 'Не удалось связаться с сервисом распознавания речи.',
        });
      }

      if (!upstreamResponse.ok) {
        throw createError({
          statusCode: 502,
          statusMessage: 'Bad Gateway',
          message: 'Сервис распознавания речи временно недоступен.',
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
          message: 'Получен некорректный ответ от сервиса распознавания речи.',
        });
      }

      return parseAiTranscribeResponse(rawUpstream);
    } finally {
      slot.release();
    }
  });
}
