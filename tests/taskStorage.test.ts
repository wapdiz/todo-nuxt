import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Task } from '../app/types/task';
import { createTaskStorage, TASK_STORAGE_KEY, type StoragePort } from '../app/utils/taskStorage';

class MemoryStorage implements StoragePort {
  values = new Map<string, string>();
  reads = 0;
  writes = 0;
  readError: Error | null = null;
  writeError: Error | null = null;

  getItem(key: string): string | null {
    this.reads++;
    if (this.readError) throw this.readError;
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.writeError) throw this.writeError;
    this.writes++;
    this.values.set(key, value);
  }
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Сохранённая задача',
    completed: false,
    scheduledDate: '2026-11-11',
    createdAt: '2026-11-10T17:30:00.000Z',
    ...overrides,
  };
}

function envelope(tasks: unknown, version: unknown = 1): string {
  return JSON.stringify({ version, tasks });
}

function namedError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

test('creation defers storage access and an absent key loads without writing', () => {
  const memory = new MemoryStorage();
  let accesses = 0;
  const storage = createTaskStorage(() => {
    accesses++;
    return memory;
  });

  assert.equal(accesses, 0);
  assert.doesNotThrow(() => createTaskStorage());
  assert.deepEqual(storage.load(), { ok: true, tasks: [] });
  assert.equal(accesses, 1);
  assert.equal(memory.writes, 0);
  assert.equal(memory.values.has(TASK_STORAGE_KEY), false);
});

test('save and reset cannot write before loading', () => {
  const memory = new MemoryStorage();
  const storage = createTaskStorage(() => memory);

  assert.deepEqual(storage.save([task()]), { ok: false, issue: 'not-initialized' });
  assert.deepEqual(storage.reset(), { ok: false, issue: 'not-initialized' });
  assert.equal(memory.reads, 0);
  assert.equal(memory.writes, 0);
});

test('round-trips every task field and preserves order across successive saves', () => {
  const memory = new MemoryStorage();
  const storage = createTaskStorage(() => memory);
  const tasks = [task({ id: 'newest', completed: true }), task({ id: 'oldest', scheduledDate: '2024-02-29' })];

  assert.deepEqual(storage.load(), { ok: true, tasks: [] });
  assert.deepEqual(storage.save(tasks), { ok: true });
  assert.deepEqual(JSON.parse(memory.values.get(TASK_STORAGE_KEY)!), { version: 1, tasks });
  assert.deepEqual(createTaskStorage(() => memory).load(), { ok: true, tasks });
  assert.deepEqual(storage.save(tasks.slice(1)), { ok: true });
  assert.deepEqual(storage.load(), { ok: true, tasks: tasks.slice(1) });
});

test('rejects malformed JSON and envelopes without changing original data', () => {
  for (const raw of ['{', 'null', '[]', '{}', envelope(null), envelope({}), envelope([], '1')]) {
    const memory = new MemoryStorage();
    memory.values.set(TASK_STORAGE_KEY, raw);
    const storage = createTaskStorage(() => memory);

    assert.deepEqual(storage.load(), { ok: false, issue: 'invalid-data' }, raw);
    assert.deepEqual(storage.save([]), { ok: false, issue: 'not-initialized' });
    assert.equal(memory.values.get(TASK_STORAGE_KEY), raw);
    assert.equal(memory.writes, 0);
  }
});

test('rejects an entire list when any record is invalid or identifiers repeat', () => {
  const invalidRecords = [
    null,
    [],
    {},
    task({ id: '' }),
    task({ id: ' padded ' }),
    task({ title: '' }),
    task({ title: ' padded ' }),
    task({ title: 'x'.repeat(201) }),
    { ...task(), completed: 'true' },
    task({ scheduledDate: '2026-02-29' }),
    task({ createdAt: 'not-a-date' }),
    task({ createdAt: '2026-11-10' }),
    task({ createdAt: '2026-11-10T17:30:00+00:00' }),
    { ...task(), scheduledDate: null },
  ];

  for (const records of [...invalidRecords.map((record) => [task({ id: 'valid' }), record]), [task(), task()]]) {
    const memory = new MemoryStorage();
    const raw = envelope(records);
    memory.values.set(TASK_STORAGE_KEY, raw);

    assert.deepEqual(createTaskStorage(() => memory).load(), { ok: false, issue: 'invalid-data' });
    assert.equal(memory.values.get(TASK_STORAGE_KEY), raw);
    assert.equal(memory.writes, 0);
  }
});

test('rejects unsupported numeric versions without migrating or overwriting them', () => {
  for (const version of [0, 2, -1, 1.5]) {
    const memory = new MemoryStorage();
    const raw = envelope([task()], version);
    memory.values.set(TASK_STORAGE_KEY, raw);
    const storage = createTaskStorage(() => memory);

    assert.deepEqual(storage.load(), { ok: false, issue: 'unsupported-version' });
    assert.deepEqual(storage.save([]), { ok: false, issue: 'not-initialized' });
    assert.equal(memory.values.get(TASK_STORAGE_KEY), raw);
  }
});

test('ignores unknown fields and reconstructs plain task objects', () => {
  const memory = new MemoryStorage();
  const rawTask = JSON.parse(JSON.stringify(task()).replace(/}$/, ',"extra":true,"__proto__":{"polluted":true}}'));
  const raw = envelope([rawTask]);
  memory.values.set(TASK_STORAGE_KEY, raw);
  const storage = createTaskStorage(() => memory);
  const loaded = storage.load();

  assert.deepEqual(loaded, { ok: true, tasks: [task()] });
  assert.ok(loaded.ok);
  assert.equal(Object.getPrototypeOf(loaded.tasks[0]), Object.prototype);
  assert.equal(Object.hasOwn(loaded.tasks[0]!, '__proto__'), false);
  assert.equal(memory.values.get(TASK_STORAGE_KEY), raw);
  assert.deepEqual(storage.save(loaded.tasks), { ok: true });
  assert.deepEqual(JSON.parse(memory.values.get(TASK_STORAGE_KEY)!), { version: 1, tasks: [task()] });
});

test('loading access failures block saving until a successful reload', () => {
  const memory = new MemoryStorage();
  const raw = envelope([task()]);
  memory.values.set(TASK_STORAGE_KEY, raw);
  const storage = createTaskStorage(() => memory);
  assert.ok(storage.load().ok);

  memory.readError = namedError('SecurityError');
  assert.deepEqual(storage.load(), { ok: false, issue: 'unavailable' });
  memory.readError = null;
  assert.deepEqual(storage.save([]), { ok: false, issue: 'not-initialized' });
  assert.deepEqual(storage.reset(), { ok: false, issue: 'not-initialized' });
  assert.equal(memory.values.get(TASK_STORAGE_KEY), raw);
  assert.ok(storage.load().ok);
  assert.deepEqual(storage.save([]), { ok: true });
});

test('storage getter failures are caught rather than escaping to the caller', () => {
  const storage = createTaskStorage(() => {
    throw namedError('SecurityError');
  });

  assert.deepEqual(storage.load(), { ok: false, issue: 'unavailable' });
  assert.deepEqual(storage.save([]), { ok: false, issue: 'not-initialized' });
});

test('write failures preserve data and allow retry with the last snapshot', () => {
  for (const [name, issue] of [
    ['QuotaExceededError', 'quota-exceeded'],
    ['NS_ERROR_DOM_QUOTA_REACHED', 'quota-exceeded'],
    ['SecurityError', 'unavailable'],
    ['Error', 'write-error'],
  ]) {
    const memory = new MemoryStorage();
    const raw = envelope([task()]);
    memory.values.set(TASK_STORAGE_KEY, raw);
    const storage = createTaskStorage(() => memory);
    assert.ok(storage.load().ok);

    memory.writeError = namedError(name!);
    assert.deepEqual(storage.save([]), { ok: false, issue });
    assert.equal(memory.values.get(TASK_STORAGE_KEY), raw);
    memory.writeError = null;
    assert.deepEqual(storage.save([]), { ok: true });
  }
});

test('a read failure while saving can be retried without replacing the snapshot', () => {
  const memory = new MemoryStorage();
  const storage = createTaskStorage(() => memory);
  assert.ok(storage.load().ok);
  memory.readError = namedError('SecurityError');
  assert.deepEqual(storage.save([task()]), { ok: false, issue: 'unavailable' });
  memory.readError = null;
  assert.deepEqual(storage.save([task()]), { ok: true });
});

test('refuses stale writes after another tab changes or deletes the key', () => {
  for (const changedRaw of [envelope([task({ id: 'other-tab' })]), null]) {
    const memory = new MemoryStorage();
    memory.values.set(TASK_STORAGE_KEY, envelope([task()]));
    const storage = createTaskStorage(() => memory);
    assert.ok(storage.load().ok);
    if (changedRaw === null) memory.values.delete(TASK_STORAGE_KEY);
    else memory.values.set(TASK_STORAGE_KEY, changedRaw);

    assert.deepEqual(storage.save([]), { ok: false, issue: 'conflict' });
    assert.deepEqual(storage.save([]), { ok: false, issue: 'not-initialized' });
    assert.equal(memory.values.get(TASK_STORAGE_KEY) ?? null, changedRaw);
    assert.ok(storage.load().ok);
    assert.deepEqual(storage.save([]), { ok: true });
  }
});

test('validates save input before touching persisted data', () => {
  const memory = new MemoryStorage();
  const storage = createTaskStorage(() => memory);
  assert.ok(storage.load().ok);

  assert.deepEqual(storage.save([task({ title: ' ' })]), { ok: false, issue: 'invalid-data' });
  assert.deepEqual(storage.save([task(), task()]), { ok: false, issue: 'invalid-data' });
  assert.equal(memory.values.has(TASK_STORAGE_KEY), false);
  assert.equal(memory.writes, 0);
});

test('explicit reset replaces only this task key and unlocks a previously invalid list', () => {
  for (const raw of ['{', envelope([task()], 2), envelope([task()])]) {
    const memory = new MemoryStorage();
    memory.values.set(TASK_STORAGE_KEY, raw);
    memory.values.set('unrelated', 'keep me');
    const storage = createTaskStorage(() => memory);
    storage.load();

    assert.deepEqual(storage.reset(), { ok: true });
    assert.equal(memory.values.get(TASK_STORAGE_KEY), envelope([]));
    assert.equal(memory.values.get('unrelated'), 'keep me');
    assert.deepEqual(storage.save([task()]), { ok: true });
  }
});

test('explicit reset refuses changed data and preserves data on failed writes', () => {
  const memory = new MemoryStorage();
  memory.values.set(TASK_STORAGE_KEY, '{');
  const storage = createTaskStorage(() => memory);
  storage.load();
  const changedRaw = envelope([task({ id: 'other-tab' })]);
  memory.values.set(TASK_STORAGE_KEY, changedRaw);
  assert.deepEqual(storage.reset(), { ok: false, issue: 'conflict' });
  assert.equal(memory.values.get(TASK_STORAGE_KEY), changedRaw);

  storage.load();
  memory.writeError = namedError('QuotaExceededError');
  assert.deepEqual(storage.reset(), { ok: false, issue: 'quota-exceeded' });
  assert.equal(memory.values.get(TASK_STORAGE_KEY), changedRaw);
  memory.writeError = null;
  assert.deepEqual(storage.reset(), { ok: true });
});
