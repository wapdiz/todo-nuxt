import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';
import { createApp, toNodeListener } from 'h3';
import { reactive } from 'vue';
import {
  AI_TRANSCRIBE_MAX_AUDIO_BYTES,
  AI_TRANSCRIBE_MAX_REQUEST_BYTES,
  mergeTranscribedDraft,
  parseAiTranscribeRequest,
  parseAiTranscribeResponse,
  resolveAudioFormatFromMime,
} from '../shared/utils/aiTranscribe';
import {
  createVoiceRecorderController,
  formatVoiceDuration,
  pickRecorderMimeCandidate,
  type VoiceMediaStream,
  type VoiceRecorderAdapter,
  type VoiceRecorderHost,
} from '../app/utils/voiceRecorder';
import { createAiChatHandler } from '../server/utils/aiChatHandler';
import { createAiGuard } from '../server/utils/aiRateLimit';
import { createAiTranscribeHandler } from '../server/utils/aiTranscribeHandler';

function getPort(server: http.Server): number {
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return address.port;
}

function makeBase64Bytes(byteLength: number): string {
  return Buffer.alloc(byteLength, 0x41).toString('base64');
}

test('resolveAudioFormatFromMime maps supported container MIME types and ignores codec params', () => {
  assert.equal(resolveAudioFormatFromMime('audio/webm;codecs=opus'), 'webm');
  assert.equal(resolveAudioFormatFromMime('audio/ogg;codecs=opus'), 'ogg');
  assert.equal(resolveAudioFormatFromMime('AUDIO/MP4'), 'mp4');
  assert.equal(resolveAudioFormatFromMime('audio/x-m4a'), 'm4a');
  assert.equal(resolveAudioFormatFromMime('audio/wav'), 'wav');
  assert.equal(resolveAudioFormatFromMime('video/mp4'), null);
  assert.equal(resolveAudioFormatFromMime(''), null);
});

test('parseAiTranscribeRequest validates audio format, strict base64 and decoded size bounds', () => {
  const ok = parseAiTranscribeRequest({ audioBase64: makeBase64Bytes(128), format: 'webm' });
  assert.ok(ok);
  assert.equal(ok.format, 'webm');

  assert.equal(parseAiTranscribeRequest({ audioBase64: makeBase64Bytes(16), format: 'webm' }), null);
  assert.equal(
    parseAiTranscribeRequest({ audioBase64: makeBase64Bytes(AI_TRANSCRIBE_MAX_AUDIO_BYTES + 4), format: 'webm' }),
    null,
  );
  assert.equal(parseAiTranscribeRequest({ audioBase64: 'not*valid*base64==', format: 'webm' }), null);
  assert.equal(parseAiTranscribeRequest({ audioBase64: makeBase64Bytes(128), format: 'flac' }), null);
});

test('parseAiTranscribeResponse normalizes JSON, nested objects and multiline whitespace', () => {
  assert.deepEqual(parseAiTranscribeResponse({ text: '  Купить   молоко\nи хлеб  ' }), {
    text: 'Купить молоко и хлеб',
  });
  assert.deepEqual(parseAiTranscribeResponse({ output: { text: 'Отчет к пятнице' } }), {
    text: 'Отчет к пятнице',
  });
  assert.deepEqual(parseAiTranscribeResponse(JSON.stringify({ data: { text: 'Созвон в 15:00' } })), {
    text: 'Созвон в 15:00',
  });
  assert.deepEqual(parseAiTranscribeResponse({ error: 'unexpected' }), { text: '' });
});

test('mergeTranscribedDraft inserts, appends with smart spacing and respects maxLength', () => {
  assert.deepEqual(mergeTranscribedDraft('', 'Купить молоко', 200), {
    value: 'Купить молоко',
    truncated: false,
  });
  assert.deepEqual(mergeTranscribedDraft('Добавь задачи: ', 'завтра спорт и отчет', 500), {
    value: 'Добавь задачи: завтра спорт и отчет',
    truncated: false,
  });
  assert.deepEqual(mergeTranscribedDraft('Позвонить', 'в офис', 200), {
    value: 'Позвонить в офис',
    truncated: false,
  });
  assert.deepEqual(mergeTranscribedDraft('Купить', 'молоко и свежий хлеб', 15), {
    value: 'Купить молоко и',
    truncated: true,
  });
  assert.deepEqual(mergeTranscribedDraft('12345', 'лишнее', 5), {
    value: '12345',
    truncated: true,
  });
});

test('HTTP integration: /api/ai-transcribe enforces limits, shares guard with chat and forwards OpenRouter payload', async () => {
  let upstreamPayload: any = null;
  let upstreamToken = '';
  let resolveHeldUpstream: (() => void) | null = null;
  let holdNextUpstream = false;

  const guard = createAiGuard({
    rateLimitPerMinute: 12,
    dailyLimit: 20,
    maxConcurrentPerIp: 1,
    maxConcurrentGlobal: 1,
  });

  const baseConfig = {
    n8nWebhookUrl: 'https://n8n.example.test/webhook/todo-ai-chat',
    n8nAuthHeaderName: 'X-Todo-Ai-Token',
    n8nAuthHeaderValue: 'test-token',
    aiTrustProxy: false,
    aiRateLimitPerMinute: 12,
    aiDailyRequestLimit: 20,
    aiMaxConcurrentPerIp: 1,
    aiMaxConcurrentGlobal: 1,
  };

  const app = createApp();
  app.use(
    '/api/ai-transcribe',
    createAiTranscribeHandler({
      guard,
      getConfig: () => baseConfig,
      fetchImpl: async (_url, init) => {
        upstreamToken = (init?.headers as Record<string, string>)['X-Todo-Ai-Token'] ?? '';
        upstreamPayload = JSON.parse(String(init?.body ?? '{}'));
        if (holdNextUpstream) {
          await new Promise<void>((resolve) => {
            resolveHeldUpstream = resolve;
          });
        }
        return new Response(JSON.stringify({ text: '  Купить кофе   и сыр ' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    }),
  );
  app.use(
    '/api/ai-chat',
    createAiChatHandler({
      guard,
      getConfig: () => baseConfig,
      fetchImpl: async () =>
        new Response(JSON.stringify({ reply: 'Готово', proposals: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    }),
  );

  const server = http.createServer(toNodeListener(app));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const port = getPort(server);

    // 1. Oversized Content-Length отклоняется до захвата лимита.
    const countBefore = guard.getStats().dailyCount;
    const clRes = await fetch(`http://127.0.0.1:${port}/api/ai-transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: 'A'.repeat(AI_TRANSCRIBE_MAX_REQUEST_BYTES), format: 'webm' }),
    });
    assert.equal(clRes.status, 413);
    assert.equal(guard.getStats().dailyCount, countBefore);
    assert.equal(guard.getStats().globalInFlight, 0);

    // 2. Chunked > лимита освобождает concurrency slot.
    const chunkedRes = await new Promise<number>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/ai-transcribe',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' },
        },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode ?? 0));
        },
      );
      req.on('error', () => {});
      req.write('{"format":"webm","audioBase64":"');
      req.write('A'.repeat(AI_TRANSCRIBE_MAX_REQUEST_BYTES + 1024));
      req.write('"}');
      setTimeout(() => {
        if (!req.destroyed) {
          try {
            req.write('extra');
            req.end();
          } catch {
            // Сокет закрыт
          }
        }
      }, 25);
      setTimeout(() => reject(new Error('Timed out waiting for chunked 413')), 4000);
    });
    assert.equal(chunkedRes, 413);
    assert.equal(guard.getStats().globalInFlight, 0);

    // 3. Одновременный запрос в /api/ai-chat во время активной транскрибации блокируется общим guard (429).
    holdNextUpstream = true;
    const validBase64 = makeBase64Bytes(256);
    const transcribePromise = fetch(`http://127.0.0.1:${port}/api/ai-transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: validBase64, format: 'webm' }),
    });

    while (!resolveHeldUpstream) {
      await new Promise((r) => setTimeout(r, 10));
    }

    const concurrentChatRes = await fetch(`http://127.0.0.1:${port}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Привет',
        mode: 'chat',
        activeDate: '2026-11-11',
        todayDate: '2026-11-11',
        tasks: [],
        history: [],
      }),
    });
    assert.equal(concurrentChatRes.status, 429);

    holdNextUpstream = false;
    resolveHeldUpstream();
    const okRes = await transcribePromise;
    assert.equal(okRes.status, 200);
    assert.deepEqual(await okRes.json(), { text: 'Купить кофе и сыр' });
    assert.equal(upstreamToken, 'test-token');
    assert.deepEqual(upstreamPayload, {
      action: 'transcribe',
      input_audio: {
        data: validBase64,
        format: 'webm',
      },
    });
    assert.equal(guard.getStats().globalInFlight, 0);
    // 4. Некорректные данные -> 400 (дневная квота не тратится), ошибка upstream -> 502, таймаут -> 504
    const countBeforeBadTranscribe = guard.getStats().dailyCount;
    const badRes = await fetch(`http://127.0.0.1:${port}/api/ai-transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: 'not-valid', format: 'webm' }),
    });
    assert.equal(badRes.status, 400);
    assert.equal(guard.getStats().dailyCount, countBeforeBadTranscribe);
    assert.equal(guard.getStats().globalInFlight, 0);

    // Ошибочный ответ от пустого JSON-объекта на обоих маршрутах не мешает следующему валидному запросу.
    const emptyChatBad = await fetch(`http://127.0.0.1:${port}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(emptyChatBad.status, 400);
    assert.equal(guard.getStats().dailyCount, countBeforeBadTranscribe);

    const errApp = createApp();
    errApp.use(
      '/unconfigured',
      createAiTranscribeHandler({
        getConfig: () => ({ ...baseConfig, n8nWebhookUrl: '' }),
      }),
    );
    errApp.use(
      '/bad-gw',
      createAiTranscribeHandler({
        getConfig: () => baseConfig,
        fetchImpl: async () => new Response('fail', { status: 502 }),
      }),
    );
    errApp.use(
      '/timeout',
      createAiTranscribeHandler({
        getConfig: () => baseConfig,
        fetchImpl: async () => {
          throw Object.assign(new Error('Timed out'), { name: 'TimeoutError' });
        },
      }),
    );
    const errServer = http.createServer(toNodeListener(errApp));
    await new Promise<void>((resolve) => errServer.listen(0, '127.0.0.1', resolve));
    try {
      const errPort = getPort(errServer);
      const res503 = await fetch(`http://127.0.0.1:${errPort}/unconfigured`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: validBase64, format: 'webm' }),
      });
      assert.equal(res503.status, 503);

      const res502 = await fetch(`http://127.0.0.1:${errPort}/bad-gw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: validBase64, format: 'webm' }),
      });
      assert.equal(res502.status, 502);

      const res504 = await fetch(`http://127.0.0.1:${errPort}/timeout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: validBase64, format: 'webm' }),
      });
      assert.equal(res504.status, 504);
    } finally {
      await new Promise<void>((resolve) => errServer.close(() => resolve()));
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('createVoiceRecorderController handles start/stop, cancellation races, timers and cleanup', async () => {
  assert.equal(
    pickRecorderMimeCandidate((m) => m === 'audio/mp4'),
    'audio/mp4',
  );
  assert.equal(formatVoiceDuration(0), '00:00');
  assert.equal(formatVoiceDuration(12_900), '00:12');

  // 1. Unsupported browser sets error without throwing
  const unsupportedHost: VoiceRecorderHost = {
    isSupported: () => false,
    isMimeTypeSupported: () => false,
    requestMicrophone: async () => ({ getTracks: () => [] }),
    createRecorder: () => {
      throw new Error('should not be called');
    },
    createBlob: () => new Blob([]),
    blobToBase64: async () => '',
    now: () => 0,
    setTimeout: () => 0 as any,
    clearTimeout: () => {},
    setInterval: () => 0 as any,
    clearInterval: () => {},
  };
  const unsupportedCtrl = createVoiceRecorderController({
    host: unsupportedHost,
    createState: (initial) => reactive(initial),
    onTranscript: () => {},
  });
  await unsupportedCtrl.start();
  assert.equal(unsupportedCtrl.state.status, 'idle');
  assert.match(unsupportedCtrl.state.error, /HTTPS|localhost/);

  // 2. Cancel during starting stops delayed stream tracks immediately
  let delayedStreamResolve: ((stream: VoiceMediaStream) => void) | null = null;
  let stoppedLateTracks = 0;
  let tracksStoppedOnFinish = 0;
  let uploadedBase64 = '';
  let uploadedFormat = '';
  let receivedTranscript = '';
  let recorderStoppedCleanly = false;
  let triggerRecorderDataAndStop: ((size: number, mime: string) => void) | null = null;

  const mockHost: VoiceRecorderHost = {
    isSupported: () => true,
    isMimeTypeSupported: (mime) => mime === 'audio/webm;codecs=opus',
    requestMicrophone: () =>
      new Promise<VoiceMediaStream>((resolve) => {
        delayedStreamResolve = resolve;
      }),
    createRecorder: (_stream, mimeType) => {
      const adapter: VoiceRecorderAdapter = {
        mimeType: mimeType ?? 'audio/webm;codecs=opus',
        onDataAvailable: null,
        onStop: null,
        onError: null,
        start() {},
        stop() {
          recorderStoppedCleanly = true;
          triggerRecorderDataAndStop?.(256, adapter.mimeType);
        },
      };
      triggerRecorderDataAndStop = (size, mime) => {
        adapter.onDataAvailable?.(new Blob([new Uint8Array(size)], { type: mime }));
        adapter.onStop?.();
      };
      return adapter;
    },
    createBlob: (chunks, mimeType) => new Blob(chunks, { type: mimeType }),
    blobToBase64: async (blob) => makeBase64Bytes(blob.size),
    now: () => 1000,
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id),
    setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
    clearInterval: (id) => globalThis.clearInterval(id),
  };

  const raceCtrl = createVoiceRecorderController({
    host: mockHost,
    onTranscript: (t) => {
      receivedTranscript = t;
    },
  });

  const startRace = raceCtrl.start();
  assert.equal(raceCtrl.state.status, 'starting');
  raceCtrl.cancel();
  assert.equal(raceCtrl.state.status, 'idle');

  delayedStreamResolve!({
    getTracks: () => [{ stop: () => void (stoppedLateTracks += 1) }],
  });
  await startRace;
  assert.equal(stoppedLateTracks, 1);
  assert.equal(raceCtrl.state.status, 'idle');

  // 3. Normal recording -> stop -> transcribing -> onTranscript (no auto-send error)
  mockHost.requestMicrophone = async () => ({
    getTracks: () => [{ stop: () => void (tracksStoppedOnFinish += 1) }],
  });

  const okCtrl = createVoiceRecorderController({
    host: mockHost,
    createState: (initial) => reactive(initial),
    transcribeAudio: async (payload) => {
      assert.equal(tracksStoppedOnFinish, 1);
      uploadedBase64 = payload.audioBase64;
      uploadedFormat = payload.format;
      return { text: 'Купить билеты на поезд' };
    },
    onTranscript: (t) => {
      receivedTranscript = t;
    },
  });

  await okCtrl.start();
  assert.equal(okCtrl.state.status, 'recording');
  okCtrl.stop();
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(recorderStoppedCleanly, true);
  assert.equal(uploadedFormat, 'webm');
  assert.equal(uploadedBase64, makeBase64Bytes(256));
  assert.equal(receivedTranscript, 'Купить билеты на поезд');
  assert.equal(okCtrl.state.status, 'idle');

  // 4. Short recording rejected client-side, empty speech triggers onEmptyTranscript, maxDuration auto-stops
  let emptyTriggered = false;
  let autoTranscript = '';
  let shortTranscribeCalls = 0;

  const shortCtrl = createVoiceRecorderController({
    host: {
      ...mockHost,
      createRecorder: (_stream, mimeType) => {
        const adapter: VoiceRecorderAdapter = {
          mimeType: mimeType ?? 'audio/webm',
          onDataAvailable: null,
          onStop: null,
          onError: null,
          start() {},
          stop() {
            adapter.onDataAvailable?.(new Blob([new Uint8Array(8)], { type: adapter.mimeType }));
            adapter.onStop?.();
          },
        };
        return adapter;
      },
    },
    transcribeAudio: async () => {
      shortTranscribeCalls += 1;
      return { text: 'ignored' };
    },
    onTranscript: () => {
      assert.fail('Should reject short audio before upload');
    },
  });
  await shortCtrl.start();
  shortCtrl.stop();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(shortTranscribeCalls, 0);
  assert.match(shortCtrl.state.error, /короткой/);

  const autoStopCtrl = createVoiceRecorderController({
    host: mockHost,
    maxDurationMs: 25,
    transcribeAudio: async () => ({ text: '' }),
    onTranscript: (t) => {
      autoTranscript = t;
    },
    onEmptyTranscript: () => {
      emptyTriggered = true;
    },
  });
  await autoStopCtrl.start();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(autoStopCtrl.state.status, 'idle');
  assert.equal(emptyTriggered, true);
  assert.equal(autoTranscript, '');

  // 5. Dispose during upload aborts signal
  let abortObserved = false;
  let emptyCalled = false;
  const disposeCtrl = createVoiceRecorderController({
    host: mockHost,
    transcribeAudio: (_payload, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          abortObserved = true;
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      }),
    onTranscript: () => {
      assert.fail('Should not emit transcript after dispose');
    },
    onEmptyTranscript: () => {
      emptyCalled = true;
    },
  });

  await disposeCtrl.start();
  disposeCtrl.stop();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(disposeCtrl.state.status, 'transcribing');
  disposeCtrl.dispose();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(abortObserved, true);
  assert.equal(emptyCalled, false);
  assert.equal(disposeCtrl.state.status, 'idle');
});
