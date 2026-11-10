import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { createApp, createEvent, toNodeListener } from 'h3';
import { reactive, watch } from 'vue';
import type { AiChatRequest, AiChatResponse } from '../shared/types/aiChat';
import {
  AI_MAX_CONTEXT_TASKS,
  AI_MAX_HISTORY_ITEMS,
  AI_MAX_MESSAGE_LENGTH,
  AI_MAX_REQUEST_BYTES,
  AI_TASK_TITLE_MAX_LENGTH,
  parseAiChatRequest,
  parseAiChatResponse,
} from '../shared/utils/aiChat';
import { createAiChatService, createAiComposerController } from '../app/utils/aiChatState';
import { readBoundedJsonBody, readBoundedNodeBody } from '../server/utils/aiBody';
import { createAiChatHandler } from '../server/utils/aiChatHandler';
import { createAiGuard, resolveClientIp } from '../server/utils/aiRateLimit';

function makeValidRequest(overrides: Partial<AiChatRequest> = {}): AiChatRequest {
  return {
    message: 'Завтра купить молоко и отправить отчет',
    mode: 'create_tasks',
    activeDate: '2026-11-11',
    todayDate: '2026-11-11',
    tasks: [{ id: 't-1', title: 'Подготовить план', completed: false, scheduledDate: '2026-11-11' }],
    history: [{ role: 'user', text: 'Привет' }],
    ...overrides,
  };
}

function getPort(server: http.Server): number {
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return address.port;
}

test('parseAiChatRequest enforces bounds on message, tasks, dates and history', () => {
  const valid = makeValidRequest();
  const parsed = parseAiChatRequest(valid);
  assert.ok(parsed);
  assert.equal(parsed.tasks.length, 1);

  assert.equal(parseAiChatRequest(makeValidRequest({ message: '   ' })), null);
  assert.equal(parseAiChatRequest(makeValidRequest({ message: 'a'.repeat(AI_MAX_MESSAGE_LENGTH + 1) })), null);
  assert.equal(parseAiChatRequest(makeValidRequest({ mode: 'delete_all' as any })), null);
  assert.equal(parseAiChatRequest(makeValidRequest({ activeDate: '2026-02-29' })), null);
  assert.equal(
    parseAiChatRequest(
      makeValidRequest({
        tasks: Array.from({ length: AI_MAX_CONTEXT_TASKS + 1 }, (_v, i) => ({
          id: `id-${i}`,
          title: 'Задача',
          completed: false,
          scheduledDate: '2026-11-11',
        })),
      }),
    ),
    null,
  );
  assert.equal(
    parseAiChatRequest(
      makeValidRequest({
        tasks: [
          { id: 't-1', title: 'x'.repeat(AI_TASK_TITLE_MAX_LENGTH + 1), completed: false, scheduledDate: '2026-11-11' },
        ],
      }),
    ),
    null,
  );
  assert.equal(
    parseAiChatRequest(
      makeValidRequest({
        tasks: [{ id: 't-1', title: 'Другой день', completed: false, scheduledDate: '2026-11-12' }],
      }),
    ),
    null,
  );
  assert.equal(
    parseAiChatRequest(
      makeValidRequest({
        history: Array.from({ length: AI_MAX_HISTORY_ITEMS + 1 }, () => ({ role: 'user' as const, text: 'hi' })),
      }),
    ),
    null,
  );

  // Максимально допустимый по схеме запрос стабильно укладывается в AI_MAX_REQUEST_BYTES.
  const maxPayload = makeValidRequest({
    message: 'Ж'.repeat(AI_MAX_MESSAGE_LENGTH),
    tasks: Array.from({ length: AI_MAX_CONTEXT_TASKS }, (_v, i) => ({
      id: `task-${i}`.padEnd(64, 'a'),
      title: 'Я'.repeat(AI_TASK_TITLE_MAX_LENGTH),
      completed: false,
      scheduledDate: '2026-11-11',
    })),
    history: Array.from({ length: AI_MAX_HISTORY_ITEMS }, () => ({
      role: 'user' as const,
      text: 'Б'.repeat(AI_MAX_MESSAGE_LENGTH),
    })),
  });
  assert.ok(parseAiChatRequest(maxPayload));
  assert.ok(Buffer.byteLength(JSON.stringify(maxPayload), 'utf8') < AI_MAX_REQUEST_BYTES);
});

test('parseAiChatResponse normalizes fenced JSON, drops unknown actions and fixes invalid dates', () => {
  const fenced = [
    '```json',
    JSON.stringify({
      reply: 'Готово, добавил две задачи.',
      proposals: [
        {
          id: 'p-1',
          type: 'add_tasks',
          summary: 'Покупки',
          tasks: [
            { title: 'Купить молоко', scheduledDate: '2026-11-12' },
            { title: 'Отправить отчет', scheduledDate: '2026-02-29' },
          ],
        },
        {
          id: 'p-bad',
          type: 'delete_all',
          summary: 'Опасно',
        },
      ],
    }),
    '```',
  ].join('\n');

  const normalized = parseAiChatResponse({ output: fenced }, '2026-11-11');
  assert.equal(normalized.reply, 'Готово, добавил две задачи.');
  assert.equal(normalized.proposals.length, 1);
  assert.equal(normalized.proposals[0]?.type, 'add_tasks');
  if (normalized.proposals[0]?.type === 'add_tasks') {
    assert.deepEqual(normalized.proposals[0].tasks, [
      { title: 'Купить молоко', scheduledDate: '2026-11-12' },
      { title: 'Отправить отчет', scheduledDate: '2026-11-11' },
    ]);
  }

  const plain = parseAiChatResponse('Обычный текстовый ответ без JSON', '2026-11-11');
  assert.equal(plain.reply, 'Обычный текстовый ответ без JSON');
  assert.deepEqual(plain.proposals, []);
});

test('parseAiChatResponse assigns unique app-side IDs when model repeats proposal IDs', () => {
  const response = parseAiChatResponse(
    {
      reply: 'Два набора задач.',
      proposals: [
        {
          id: 'p-1',
          type: 'add_tasks',
          summary: 'Набор 1',
          tasks: [{ title: 'Первая', scheduledDate: '2026-11-11' }],
        },
        {
          id: 'p-1',
          type: 'add_tasks',
          summary: 'Набор 2',
          tasks: [{ title: 'Вторая', scheduledDate: '2026-11-11' }],
        },
      ],
    },
    '2026-11-11',
  );

  assert.equal(response.proposals.length, 2);
  const firstId = response.proposals[0]!.id;
  const secondId = response.proposals[1]!.id;
  assert.notEqual(firstId, 'p-1');
  assert.notEqual(secondId, 'p-1');
  assert.notEqual(firstId, secondId);
});

test('createAiGuard enforces concurrency, minute rate limit, UTC daily limit and resolveClientIp trustProxy', () => {
  const fakeReq = {
    headers: { 'x-forwarded-for': '203.0.113.5' },
    socket: { remoteAddress: '127.0.0.1' },
  } as any;
  const event = createEvent(fakeReq, {} as any);
  assert.equal(resolveClientIp(event, false), '127.0.0.1');
  assert.equal(resolveClientIp(event, true), '203.0.113.5');

  let clock = Date.UTC(2026, 10, 11, 23, 59, 0);
  const guard = createAiGuard({
    rateLimitPerMinute: 2,
    dailyLimit: 3,
    maxConcurrentPerIp: 1,
    maxConcurrentGlobal: 2,
    now: () => clock,
  });

  // acquire учитывает попытку и конкурентность, но не списывает дневной бюджет до reserveDailyQuota().
  const first = guard.acquire('1.1.1.1');
  assert.equal(first.ok, true);
  assert.equal(guard.getStats().dailyCount, 0);
  const dupIp = guard.acquire('1.1.1.1');
  assert.equal(dupIp.ok, false);
  if (!dupIp.ok) assert.equal(dupIp.reason, 'concurrency');
  if (first.ok) {
    assert.deepEqual(first.reserveDailyQuota(), { ok: true });
    assert.deepEqual(first.reserveDailyQuota(), { ok: true });
    assert.equal(guard.getStats().dailyCount, 1);
    first.release();
  }

  // Отклоненный до upstream запрос (без reserveDailyQuota) не расходует дневной лимит.
  const secondAttemptOnly = guard.acquire('1.1.1.1');
  assert.equal(secondAttemptOnly.ok, true);
  if (secondAttemptOnly.ok) secondAttemptOnly.release();
  assert.equal(guard.getStats().dailyCount, 1);

  const thirdSameMinute = guard.acquire('1.1.1.1');
  assert.equal(thirdSameMinute.ok, false);
  if (!thirdSameMinute.ok) assert.equal(thirdSameMinute.reason, 'rate-limit');

  // Конкурентная гонка при остатке дневного бюджета в 1 слот: резервирует только первый, второй получает daily-limit.
  const otherIpA = guard.acquire('2.2.2.2');
  const otherIpB = guard.acquire('4.4.4.4');
  assert.equal(otherIpA.ok, true);
  assert.equal(otherIpB.ok, true);
  if (otherIpA.ok) {
    assert.deepEqual(otherIpA.reserveDailyQuota(), { ok: true });
    otherIpA.release();
  }
  if (otherIpB.ok) {
    assert.deepEqual(otherIpB.reserveDailyQuota(), { ok: true });
    otherIpB.release();
  }
  assert.equal(guard.getStats().dailyCount, 3);

  clock += 30_000;
  const hitDaily = guard.acquire('3.3.3.3');
  assert.equal(hitDaily.ok, false);
  if (!hitDaily.ok) assert.equal(hitDaily.reason, 'daily-limit');

  // После смены суток UTC дневной счетчик сбрасывается.
  clock += 35_000;
  const nextUtcDay = guard.acquire('3.3.3.3');
  assert.equal(nextUtcDay.ok, true);
  if (nextUtcDay.ok) {
    assert.deepEqual(nextUtcDay.reserveDailyQuota(), { ok: true });
    nextUtcDay.release();
  }
});

test('createAiGuard handles concurrent daily-limit race cleanly when reserving right before upstream', () => {
  const guard = createAiGuard({
    rateLimitPerMinute: 5,
    dailyLimit: 1,
    maxConcurrentPerIp: 1,
    maxConcurrentGlobal: 2,
  });

  const slotA = guard.acquire('10.0.0.1');
  const slotB = guard.acquire('10.0.0.2');
  assert.equal(slotA.ok, true);
  assert.equal(slotB.ok, true);

  if (slotA.ok) {
    assert.deepEqual(slotA.reserveDailyQuota(), { ok: true });
    slotA.release();
  }
  if (slotB.ok) {
    const res = slotB.reserveDailyQuota();
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, 'daily-limit');
    slotB.release();
  }
  assert.equal(guard.getStats().dailyCount, 1);
  assert.equal(guard.getStats().globalInFlight, 0);
});

test('readBoundedNodeBody aborts oversized streams early, detaches listeners and handles extra chunks safely', async () => {
  const stream = new PassThrough();
  const promise = readBoundedNodeBody(stream, { maxBytes: 100, timeoutMs: 1000 });

  stream.write(Buffer.alloc(60, 0x61));
  stream.write(Buffer.alloc(60, 0x62));

  await assert.rejects(promise, (err: any) => err?.statusCode === 413);

  for (const eventName of ['data', 'end', 'error', 'aborted', 'close']) {
    assert.equal(stream.listenerCount(eventName), 0, `leaked listener for ${eventName}`);
  }

  // Дополнительные чанки после отмены не должны вызывать необработанных ошибок (как в h3 getRequestWebStream).
  assert.doesNotThrow(() => {
    stream.write(Buffer.alloc(1024, 0x63));
    stream.end();
  });
});

test('readBoundedNodeBody enforces body read timeout and cleans up listeners', async () => {
  const stream = new PassThrough();
  const promise = readBoundedNodeBody(stream, { maxBytes: 1024, timeoutMs: 25 });

  await assert.rejects(promise, (err: any) => err?.statusCode === 408);
  assert.equal(stream.listenerCount('data'), 0);
  assert.equal(stream.listenerCount('end'), 0);
  stream.destroy();
});

test('HTTP integration: chunked payload > limit rejects with 413, survives extra chunks, frees concurrency slot and serves next 200', async () => {
  let upstreamCalls = 0;
  const guard = createAiGuard({
    rateLimitPerMinute: 12,
    dailyLimit: 20,
    maxConcurrentPerIp: 1,
    maxConcurrentGlobal: 1,
  });

  const app = createApp();
  app.use(
    '/api/ai-chat',
    createAiChatHandler({
      guard,
      getConfig: () => ({
        n8nWebhookUrl: 'https://n8n.example.test/webhook/todo-ai-chat',
        n8nAuthHeaderName: 'X-Todo-Ai-Token',
        n8nAuthHeaderValue: 'secret-token',
        aiTrustProxy: false,
        aiRateLimitPerMinute: 12,
        aiDailyRequestLimit: 20,
        aiMaxConcurrentPerIp: 1,
        aiMaxConcurrentGlobal: 1,
      }),
      fetchImpl: async (_url, init) => {
        upstreamCalls++;
        const headers = init?.headers as Record<string, string>;
        assert.equal(headers['X-Todo-Ai-Token'], 'secret-token');
        return new Response(
          JSON.stringify({
            reply: 'Добавил задачу.',
            proposals: [
              {
                id: 'p1',
                type: 'add_tasks',
                summary: 'Покупки',
                tasks: [{ title: 'Купить хлеб', scheduledDate: '2026-11-11' }],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    }),
  );

  const server = http.createServer(toNodeListener(app));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const port = getPort(server);

    // 1. Chunked-запрос без Content-Length: превышаем AI_MAX_REQUEST_BYTES, затем пробуем дослать еще чанк.
    const oversizedStatus = await new Promise<number>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/ai-chat',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' },
        },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode ?? 0));
        },
      );
      req.on('error', () => {
        // Сервер может закрыть соединение после отправки 413 и Connection: close; это не должно ронять тест.
      });
      req.write('{"message":"hi","mode":"chat","activeDate":"2026-11-11","todayDate":"2026-11-11","tasks":[],"pad":"');
      req.write('a'.repeat(AI_MAX_REQUEST_BYTES + 2048));
      req.write('"}');
      setTimeout(() => {
        if (!req.destroyed) {
          try {
            req.write('extra-chunk-after-limit');
            req.end();
          } catch {
            // Сокет мог быть закрыт сервером после 413
          }
        }
      }, 25);
      setTimeout(() => reject(new Error('Timed out waiting for 413 response')), 4000);
    });

    assert.equal(oversizedStatus, 413);
    assert.equal(upstreamCalls, 0);
    assert.equal(guard.getStats().globalInFlight, 0);

    // 2. Следующий корректный запрос с того же IP проходит с 200 OK (слот не залип).
    const okRes = await fetch(`http://127.0.0.1:${port}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeValidRequest({ message: 'Купить хлеб', tasks: [], history: [] })),
    });
    assert.equal(okRes.status, 200);
    const data = (await okRes.json()) as AiChatResponse;
    assert.equal(data.reply, 'Добавил задачу.');
    assert.equal(data.proposals.length, 1);
    assert.equal(guard.getStats().globalInFlight, 0);

    // 3. Явный большой Content-Length отклоняется до захвата дневного лимита.
    const countBefore = guard.getStats().dailyCount;
    const clRes = await fetch(`http://127.0.0.1:${port}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ huge: 'z'.repeat(AI_MAX_REQUEST_BYTES + 128) }),
    });
    assert.equal(clRes.status, 413);
    assert.equal(guard.getStats().dailyCount, countBefore);
    assert.equal(guard.getStats().globalInFlight, 0);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('HTTP integration: invalid 400 requests are rate-limited per IP without exhausting shared daily upstream quota', async () => {
  let upstreamCalls = 0;
  const guard = createAiGuard({
    rateLimitPerMinute: 4,
    dailyLimit: 2,
    maxConcurrentPerIp: 1,
    maxConcurrentGlobal: 2,
  });

  const sharedConfig = {
    n8nWebhookUrl: 'https://n8n.example.test/webhook/todo-ai-chat',
    n8nAuthHeaderName: 'X-Todo-Ai-Token',
    n8nAuthHeaderValue: 'secret-token',
    aiTrustProxy: true,
    aiRateLimitPerMinute: 4,
    aiDailyRequestLimit: 2,
    aiMaxConcurrentPerIp: 1,
    aiMaxConcurrentGlobal: 2,
  };

  const app = createApp();
  app.use(
    '/api/ai-chat',
    createAiChatHandler({
      guard,
      getConfig: () => sharedConfig,
      fetchImpl: async () => {
        upstreamCalls += 1;
        return new Response(JSON.stringify({ reply: 'Готово', proposals: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    }),
  );

  const server = http.createServer(toNodeListener(app));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const port = getPort(server);

    // Атакующий шлет 4 невалидных {} и исчерпывает только свой минутный IP-лимит, но не общий дневной бюджет.
    for (let i = 0; i < 4; i++) {
      const badRes = await fetch(`http://127.0.0.1:${port}/api/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.10' },
        body: '{}',
      });
      assert.equal(badRes.status, 400);
    }

    const throttledAttacker = await fetch(`http://127.0.0.1:${port}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.10' },
      body: '{}',
    });
    assert.equal(throttledAttacker.status, 429);
    assert.equal(upstreamCalls, 0);
    assert.equal(guard.getStats().dailyCount, 0);
    assert.equal(guard.getStats().globalInFlight, 0);

    // Первый валидный запрос с другого IP проходит; два одновременных на последний слот не перерасходуют бюджет.
    const firstValid = await fetch(`http://127.0.0.1:${port}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.20' },
      body: JSON.stringify(makeValidRequest({ message: 'План на день', tasks: [], history: [] })),
    });
    assert.equal(firstValid.status, 200);
    assert.equal(guard.getStats().dailyCount, 1);

    const [raceA, raceB] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/api/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.21' },
        body: JSON.stringify(makeValidRequest({ message: 'Гонка 1', tasks: [], history: [] })),
      }),
      fetch(`http://127.0.0.1:${port}/api/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.22' },
        body: JSON.stringify(makeValidRequest({ message: 'Гонка 2', tasks: [], history: [] })),
      }),
    ]);

    const raceStatuses = [raceA.status, raceB.status].sort((a, b) => a - b);
    assert.deepEqual(raceStatuses, [200, 429]);
    const rejectedRace = raceA.status === 429 ? raceA : raceB;
    assert.ok(rejectedRace.headers.get('retry-after'));
    assert.equal(upstreamCalls, 2);
    assert.equal(guard.getStats().dailyCount, 2);
    assert.equal(guard.getStats().globalInFlight, 0);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('readBoundedJsonBody releases guard on slow stalled stream timeout inside h3', async () => {
  const guard = createAiGuard({
    rateLimitPerMinute: 12,
    dailyLimit: 20,
    maxConcurrentPerIp: 1,
    maxConcurrentGlobal: 1,
  });

  const app = createApp();
  app.use('/slow', async (event) => {
    const slot = guard.acquire('127.0.0.1');
    assert.equal(slot.ok, true);
    try {
      return await readBoundedJsonBody(event, { maxBytes: 4096, timeoutMs: 40 });
    } finally {
      if (slot.ok) slot.release();
    }
  });

  const server = http.createServer(toNodeListener(app));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const port = getPort(server);
    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/slow',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' },
        },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode ?? 0));
        },
      );
      req.on('error', () => {});
      req.write('{"partial":');
      setTimeout(() => reject(new Error('Timed out waiting for 408')), 3000);
    });

    assert.equal(status, 408);
    assert.equal(guard.getStats().globalInFlight, 0);
    assert.equal(guard.getStats().dailyCount, 0);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('createAiChatService manages contextDate locking, stale aborts, duplicate apply prevention and storage failure recovery', async () => {
  let resolveSlowRequest: ((value: AiChatResponse) => void) | null = null;
  let shouldFailApply = false;
  const appliedBatches: Array<Array<{ title: string; scheduledDate: string }>> = [];
  let seq = 0;

  const service = createAiChatService({
    nextId: () => `m-${++seq}`,
    sendRequest: () =>
      new Promise<AiChatResponse>((resolve, reject) => {
        resolveSlowRequest = resolve;
        setTimeout(() => reject(new Error('unused')), 5000);
      }),
    applyTasks: (items) => {
      if (shouldFailApply) return null;
      const copy = items.map((item) => ({ ...item }));
      appliedBatches.push(copy);
      return copy.map((item, idx) => ({
        id: `created-${idx}`,
        title: item.title,
        completed: false,
        scheduledDate: item.scheduledDate,
        createdAt: '2026-11-11T10:00:00.000Z',
      }));
    },
  });

  // 1. Запрос фиксирует дату отправки и не путает ее, даже если UI переключили на другой день.
  const firstSend = service.sendMessage({
    text: 'Разбей отчет на шаги',
    mode: 'split_task',
    activeDate: '2026-11-11',
    todayDate: '2026-11-11',
    dayTasks: [
      { id: 'orig', title: 'Подготовить отчет', completed: false, scheduledDate: '2026-11-11', createdAt: '' },
    ],
  });

  assert.equal(service.state.isPending, true);
  assert.equal(service.state.messages[0]?.contextDate, '2026-11-11');

  resolveSlowRequest!({
    reply: 'Вот шаги для отчета.',
    proposals: [
      {
        id: 'split-1',
        type: 'split_task',
        summary: 'Шаги отчета',
        sourceTaskId: 'orig',
        sourceTitle: 'Подготовить отчет',
        scheduledDate: '2026-11-11',
        steps: [
          { title: 'Собрать цифры', scheduledDate: '2026-11-11' },
          { title: 'Оформить выводы', scheduledDate: '2026-11-11' },
        ],
      },
    ],
  });

  assert.equal(await firstSend, true);
  assert.equal(service.state.isPending, false);
  const assistantMsg = service.state.messages[1]!;
  assert.equal(assistantMsg.contextDate, '2026-11-11');
  const splitProposalId = assistantMsg.proposals[0]!.proposal.id;
  assert.notEqual(splitProposalId, 'split-1');

  // Ошибка сохранения откатывает статус карточки в pending и позволяет повторить попытку.
  shouldFailApply = true;
  const failedApply = service.applyProposal(assistantMsg.id, splitProposalId, [0, 1]);
  assert.deepEqual(failedApply, { ok: false, reason: 'storage-failed' });
  assert.equal(assistantMsg.proposals[0]?.status, 'pending');

  // Повтор с выбором только первого шага добавляет 1 шаг и блокирует повторное нажатие.
  shouldFailApply = false;
  const okApply = service.applyProposal(assistantMsg.id, splitProposalId, [0]);
  assert.equal(okApply.ok, true);
  assert.equal(assistantMsg.proposals[0]?.status, 'applied');
  assert.equal(assistantMsg.proposals[0]?.appliedCount, 1);
  assert.deepEqual(appliedBatches, [[{ title: 'Собрать цифры', scheduledDate: '2026-11-11' }]]);

  const duplicate = service.applyProposal(assistantMsg.id, splitProposalId, [0]);
  assert.deepEqual(duplicate, { ok: false, reason: 'already-handled' });

  // 2. Очистка чата во время ожидания отбрасывает запоздавший ответ.
  let resolveStale: ((value: AiChatResponse) => void) | null = null;
  let capturedSignal: AbortSignal | null = null;
  const staleService = createAiChatService({
    sendRequest: (_payload, signal) => {
      capturedSignal = signal;
      return new Promise<AiChatResponse>((resolve) => {
        resolveStale = resolve;
      });
    },
    applyTasks: () => [],
  });

  const pendingPromise = staleService.sendMessage({
    text: 'План на завтра',
    mode: 'chat',
    activeDate: '2026-11-12',
    todayDate: '2026-11-11',
    dayTasks: [],
  });
  assert.equal(staleService.state.isPending, true);
  staleService.clearChat();
  assert.equal(capturedSignal?.aborted, true);
  assert.equal(staleService.state.isPending, false);
  assert.equal(staleService.state.messages.length, 0);

  resolveStale!({ reply: 'Запоздалый ответ', proposals: [] });
  assert.equal(await pendingPromise, false);
  assert.equal(staleService.state.messages.length, 0);

  // 3. Ошибка сети откатывает оптимистичное сообщение пользователя и показывает ошибку.
  const failingService = createAiChatService({
    sendRequest: async () => {
      throw { statusCode: 429, data: { message: 'Лимит исчерпан' } };
    },
    applyTasks: () => [],
  });

  const failed = await failingService.sendMessage({
    text: 'Помоги спланировать',
    mode: 'chat',
    activeDate: '2026-11-11',
    todayDate: '2026-11-11',
    dayTasks: [],
  });
  assert.equal(failed, false);
  assert.equal(failingService.state.messages.length, 0);
  assert.equal(failingService.state.error, 'Лимит исчерпан');
});

test('createAiChatService triggers Vue reactive watchers when initialized via createState', async () => {
  const seenCounts: number[] = [];
  const pendingStates: boolean[] = [];

  const service = createAiChatService({
    createState: (initial) => reactive(initial),
    sendRequest: async () => ({
      reply: 'Готово',
      proposals: [
        {
          id: 'p1',
          type: 'add_tasks',
          summary: 'Список',
          tasks: [{ title: 'Купить чай', scheduledDate: '2026-11-11' }],
        },
      ],
    }),
    applyTasks: (items) =>
      items.map((item, idx) => ({
        id: `t-${idx}`,
        title: item.title,
        completed: false,
        scheduledDate: item.scheduledDate,
        createdAt: '2026-11-11T10:00:00.000Z',
      })),
  });

  const stopMessages = watch(
    () => service.state.messages.length,
    (len) => seenCounts.push(len),
    { flush: 'sync' },
  );
  const stopPending = watch(
    () => service.state.isPending,
    (flag) => pendingStates.push(flag),
    { flush: 'sync' },
  );

  await service.sendMessage({
    text: 'Добавь чай',
    mode: 'create_tasks',
    activeDate: '2026-11-11',
    todayDate: '2026-11-11',
    dayTasks: [],
  });

  stopMessages();
  stopPending();

  assert.deepEqual(seenCounts, [1, 2]);
  assert.deepEqual(pendingStates, [true, false]);
});

test('createAiChatService deduplicates colliding card IDs so applying the second card adds its own tasks', async () => {
  const appliedBatches: Array<Array<{ title: string; scheduledDate: string }>> = [];
  const service = createAiChatService({
    sendRequest: async () => ({
      reply: 'Два варианта.',
      proposals: [
        {
          id: 'p-1',
          type: 'add_tasks',
          summary: 'Вариант 1',
          tasks: [{ title: 'Задача из первой карточки', scheduledDate: '2026-11-11' }],
        },
        {
          id: 'p-1',
          type: 'add_tasks',
          summary: 'Вариант 2',
          tasks: [{ title: 'Задача из второй карточки', scheduledDate: '2026-11-11' }],
        },
      ],
    }),
    applyTasks: (items) => {
      appliedBatches.push(items.map((item) => ({ ...item })));
      return items.map((item, idx) => ({
        id: `created-${idx}`,
        title: item.title,
        completed: false,
        scheduledDate: item.scheduledDate,
        createdAt: '2026-11-11T10:00:00.000Z',
      }));
    },
  });

  await service.sendMessage({
    text: 'Предложи два списка',
    mode: 'create_tasks',
    activeDate: '2026-11-11',
    todayDate: '2026-11-11',
    dayTasks: [],
  });

  const msg = service.state.messages[1]!;
  assert.equal(msg.proposals.length, 2);
  const firstId = msg.proposals[0]!.proposal.id;
  const secondId = msg.proposals[1]!.proposal.id;
  assert.notEqual(firstId, secondId);

  const applySecond = service.applyProposal(msg.id, secondId);
  assert.equal(applySecond.ok, true);
  assert.equal(msg.proposals[0]!.status, 'pending');
  assert.equal(msg.proposals[1]!.status, 'applied');
  assert.deepEqual(appliedBatches, [[{ title: 'Задача из второй карточки', scheduledDate: '2026-11-11' }]]);
});

test('createAiComposerController preserves create_tasks and split_task modes for button submit and restores on retry', () => {
  const composer = createAiComposerController({
    createState: (initial) => reactive(initial),
  });

  composer.prepareCreateFromText();
  assert.equal(composer.state.activeMode, 'create_tasks');
  assert.equal(composer.state.draft, 'Добавь задачи: ');

  composer.state.draft = 'Купить кофе и позвонить клиенту';
  const createPayload = composer.submit(false);
  assert.deepEqual(createPayload, { text: 'Купить кофе и позвонить клиенту', mode: 'create_tasks' });
  assert.equal(composer.state.activeMode, 'chat');
  assert.equal(composer.state.draft, '');

  const openedPicker = composer.toggleSplitPicker(false);
  assert.equal(openedPicker, false);
  assert.equal(composer.state.activeMode, 'split_task');
  composer.state.draft = 'Переезд офиса';
  const splitPayload = composer.submit(false);
  assert.deepEqual(splitPayload, { text: 'Переезд офиса', mode: 'split_task' });
  assert.equal(composer.state.activeMode, 'chat');

  composer.restoreDraft('Повторить запрос', 'create_tasks');
  assert.deepEqual(composer.submit(false), { text: 'Повторить запрос', mode: 'create_tasks' });
});

test('start:server configures --env-file-if-exists=.env and Node loads env files when present without failing if absent', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  assert.match(pkg.scripts['start:server'] ?? '', /--env-file-if-exists=\.env\b/);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-nuxt-env-test-'));
  const presentEnv = path.join(tempDir, 'present.env');
  const missingEnv = path.join(tempDir, 'missing.env');
  fs.writeFileSync(presentEnv, 'NUXT_N8N_WEBHOOK_URL=https://n8n.test/webhook/todo\nNUXT_N8N_AUTH_HEADER_VALUE=tok\n');

  try {
    const loaded = execFileSync(
      process.execPath,
      [
        `--env-file-if-exists=${presentEnv}`,
        '-e',
        'console.log(JSON.stringify([process.env.NUXT_N8N_WEBHOOK_URL, process.env.NUXT_N8N_AUTH_HEADER_VALUE]))',
      ],
      { encoding: 'utf8' },
    );
    assert.deepEqual(JSON.parse(loaded.trim().split(/\r?\n/).pop()!), ['https://n8n.test/webhook/todo', 'tok']);

    const withoutFile = execFileSync(
      process.execPath,
      [`--env-file-if-exists=${missingEnv}`, '-e', 'console.log("STARTED_OK")'],
      { encoding: 'utf8' },
    );
    assert.equal(withoutFile.trim().split(/\r?\n/).pop(), 'STARTED_OK');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
