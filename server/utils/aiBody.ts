import { createError, getHeader, setHeader, type H3Event } from 'h3';
import type { Readable } from 'node:stream';

export interface BoundedBodyOptions {
  maxBytes: number;
  timeoutMs: number;
}

function parseContentLength(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Некорректный заголовок Content-Length.',
    });
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Некорректный заголовок Content-Length.',
    });
  }
  return value;
}

function toBuffer(chunk: unknown): Buffer {
  if (Buffer.isBuffer(chunk)) return chunk;
  if (typeof chunk === 'string') return Buffer.from(chunk, 'utf8');
  if (chunk instanceof Uint8Array) return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Некорректный формат потока.' });
}

export function readBoundedNodeBody(req: Readable, options: BoundedBodyOptions): Promise<Buffer> {
  const { maxBytes, timeoutMs } = options;

  return new Promise((resolve, reject) => {
    let settled = false;
    let totalBytes = 0;
    const chunks: Buffer[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      req.off('aborted', onAborted);
      req.off('close', onClose);
    };

    const stopStream = () => {
      try {
        req.pause();
      } catch {
        // Игнорируем ошибки остановки уже закрытого потока
      }
    };

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      stopStream();
      reject(error);
    };

    const succeed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(Buffer.concat(chunks, totalBytes));
    };

    const onData = (chunk: unknown) => {
      if (settled) return;

      let buf: Buffer;
      try {
        buf = toBuffer(chunk);
      } catch (err) {
        fail(err);
        return;
      }

      totalBytes += buf.byteLength;
      if (totalBytes > maxBytes) {
        fail(
          createError({
            statusCode: 413,
            statusMessage: 'Payload Too Large',
            message: 'Размер запроса превышает допустимый предел.',
          }),
        );
        return;
      }

      chunks.push(buf);
    };

    const onEnd = () => {
      succeed();
    };

    const onError = () => {
      fail(
        createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: 'Ошибка чтения тела запроса.',
        }),
      );
    };

    const onAborted = () => {
      fail(createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Запрос прерван клиентом.' }));
    };

    const onClose = () => {
      if (settled || req.readableEnded) return;
      fail(
        createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: 'Соединение закрыто до завершения запроса.',
        }),
      );
    };

    timer = setTimeout(() => {
      fail(
        createError({ statusCode: 408, statusMessage: 'Request Timeout', message: 'Превышено время чтения запроса.' }),
      );
    }, timeoutMs);

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
    req.on('aborted', onAborted);
    req.on('close', onClose);
  });
}

function decodeAndParseJson(buffer: Buffer): unknown {
  if (buffer.byteLength === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Пустое тело запроса.' });
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Ожидается корректный UTF-8 JSON.' });
  }

  try {
    return JSON.parse(text);
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Некорректный JSON.' });
  }
}

export async function readBoundedJsonBody(event: H3Event, options: BoundedBodyOptions): Promise<unknown> {
  const contentLength = parseContentLength(getHeader(event, 'content-length'));
  if (contentLength !== null && contentLength > options.maxBytes) {
    setHeader(event, 'connection', 'close');
    if (event.node?.req) {
      try {
        event.node.req.pause();
      } catch {
        // Поток мог быть уже закрыт
      }
    }
    throw createError({
      statusCode: 413,
      statusMessage: 'Payload Too Large',
      message: 'Размер запроса превышает допустимый предел.',
    });
  }

  const eventWithRaw = event as H3Event & { _requestBody?: unknown };
  if (typeof eventWithRaw._requestBody === 'string' || Buffer.isBuffer(eventWithRaw._requestBody)) {
    const buf = toBuffer(eventWithRaw._requestBody);
    if (buf.byteLength > options.maxBytes) {
      throw createError({
        statusCode: 413,
        statusMessage: 'Payload Too Large',
        message: 'Размер запроса превышает допустимый предел.',
      });
    }
    return decodeAndParseJson(buf);
  }

  const req = event.node?.req;
  if (!req) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Недоступен поток тела запроса.' });
  }

  try {
    const buffer = await readBoundedNodeBody(req, options);
    if (contentLength !== null && buffer.byteLength > options.maxBytes) {
      throw createError({
        statusCode: 413,
        statusMessage: 'Payload Too Large',
        message: 'Размер запроса превышает допустимый предел.',
      });
    }
    return decodeAndParseJson(buffer);
  } catch (error: unknown) {
    const status = typeof error === 'object' && error !== null && 'statusCode' in error ? error.statusCode : undefined;
    if (status === 413 || status === 408) {
      setHeader(event, 'connection', 'close');
      event.node.res?.once('finish', () => {
        if (!req.destroyed) req.destroy();
      });
    }
    throw error;
  }
}
