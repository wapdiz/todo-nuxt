import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { useTaskStore } from '../app/stores/taskStore';
import { TASK_TITLE_MAX_LENGTH, type Task } from '../app/types/task';
import { getLocalDate, isTaskDate, parseTaskDate } from '../app/utils/taskDate';
import type { TaskStorage, TaskStorageIssue } from '../app/utils/taskStorage';

function copyTasks(tasks: readonly Task[]): Task[] {
  return tasks.map((task) => ({ ...task }));
}

function createMemoryStorage(tasks: Task[] = []) {
  const state = {
    tasks: copyTasks(tasks),
    loadCalls: 0,
    saveCalls: 0,
    resetCalls: 0,
    loadIssue: null as TaskStorageIssue | null,
    saveIssue: null as TaskStorageIssue | null,
    resetIssue: null as TaskStorageIssue | null,
  };
  const port: TaskStorage = {
    load() {
      state.loadCalls++;
      return state.loadIssue ? { ok: false, issue: state.loadIssue } : { ok: true, tasks: copyTasks(state.tasks) };
    },
    save(candidate) {
      state.saveCalls++;
      if (state.saveIssue) return { ok: false, issue: state.saveIssue };
      state.tasks = copyTasks(candidate);
      return { ok: true };
    },
    reset() {
      state.resetCalls++;
      if (state.resetIssue) return { ok: false, issue: state.resetIssue };
      state.tasks = [];
      return { ok: true };
    },
  };
  return { port, state };
}

function savedTask(id: string, completed = false): Task {
  return { id, title: `Задача ${id}`, completed, scheduledDate: '2026-11-11', createdAt: '2026-11-11T09:00:00.000Z' };
}

beforeEach(() => {
  setActivePinia(createPinia());
  useTaskStore().initialize(createMemoryStorage().port);
});

test('creates trimmed tasks with unique identifiers, newest first', () => {
  const store = useTaskStore();
  const first = store.addTask('  Первая задача  ', '2026-11-10');
  const second = store.addTask('Вторая задача', '2026-11-11');

  assert.ok(first);
  assert.ok(second);
  assert.equal(first.title, 'Первая задача');
  assert.equal(first.completed, false);
  assert.equal(first.scheduledDate, '2026-11-10');
  assert.ok(!Number.isNaN(Date.parse(first.createdAt)));
  assert.match(first.id, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
  assert.notEqual(first.id, second.id);
  assert.deepEqual(
    store.tasks.map((task) => task.id),
    [second.id, first.id],
  );
});

test('validates title length after trimming without changing state on rejection', () => {
  const store = useTaskStore();

  assert.equal(store.addTask('', '2026-11-10'), null);
  assert.equal(store.addTask(' \t\n ', '2026-11-10'), null);
  assert.equal(store.addTask('a'.repeat(TASK_TITLE_MAX_LENGTH + 1), '2026-11-10'), null);
  assert.equal(store.tasks.length, 0);

  const task = store.addTask(` ${'a'.repeat(TASK_TITLE_MAX_LENGTH)} `, '2026-11-10');
  assert.ok(task);
  assert.equal(task.title.length, TASK_TITLE_MAX_LENGTH);
  assert.equal(store.tasks.length, 1);
});

test('allows equal titles as separate tasks', () => {
  const store = useTaskStore();
  const first = store.addTask('Повторяющаяся задача', '2026-11-10');
  const second = store.addTask('Повторяющаяся задача', '2026-11-10');

  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first.id, second.id);
  assert.equal(store.tasks.length, 2);
});

test('completion is reversible and idempotent without reordering tasks', () => {
  const store = useTaskStore();
  const first = store.addTask('Первая', '2026-11-10');
  const second = store.addTask('Вторая', '2026-11-10');
  assert.ok(first);
  assert.ok(second);
  const originalOrder = store.tasks.map((task) => task.id);

  assert.equal(store.setCompleted(first.id, true), true);
  assert.equal(store.tasks.find((task) => task.id === first.id)?.completed, true);
  assert.equal(store.setCompleted(first.id, true), true);
  assert.equal(store.setCompleted(first.id, false), true);
  assert.equal(store.tasks.find((task) => task.id === first.id)?.completed, false);
  assert.equal(store.setCompleted('missing', true), false);
  assert.deepEqual(
    store.tasks.map((task) => task.id),
    originalOrder,
  );
});

test('removes only the selected task and ignores unknown identifiers', () => {
  const store = useTaskStore();
  const first = store.addTask('Первая', '2026-11-10');
  const second = store.addTask('Вторая', '2026-11-10');
  assert.ok(first);
  assert.ok(second);

  assert.equal(store.removeTask('missing'), false);
  assert.equal(store.tasks.length, 2);
  assert.equal(store.removeTask(first.id), true);
  assert.deepEqual(
    store.tasks.map((task) => task.id),
    [second.id],
  );
  assert.equal(store.removeTask(first.id), false);
  assert.equal(store.removeTask(second.id), true);
  assert.equal(store.tasks.length, 0);
});

test('state is isolated between Pinia instances', () => {
  const first = useTaskStore(createPinia());
  const second = useTaskStore(createPinia());
  first.initialize(createMemoryStorage().port);
  second.initialize(createMemoryStorage().port);

  first.addTask('Личная задача', '2026-11-10');
  assert.equal(first.tasks.length, 1);
  assert.equal(second.tasks.length, 0);
});

test('rejects malformed dates and calendar overflows, including non-leap February', () => {
  const store = useTaskStore();
  for (const date of [
    '',
    '2026-1-10',
    '2026-11-1',
    '2026-11-10T00:00:00Z',
    '0000-01-01',
    '2026-00-01',
    '2026-13-01',
    '2026-04-31',
    '2026-02-29',
    '2026-11-00',
    '2026-11-32',
  ]) {
    assert.equal(isTaskDate(date), false, date);
    assert.equal(store.addTask('Задача', date), null, date);
  }
  assert.equal(store.tasks.length, 0);

  for (const date of ['0001-01-01', '0099-12-31', '2000-02-29', '2024-02-29', '2026-11-10', '9999-12-31']) {
    assert.equal(isTaskDate(date), true, date);
  }
  assert.equal(isTaskDate('1900-02-29'), false);
});

test('formats the supplied local day without shifting through UTC', () => {
  const localDate = new Date(2026, 10, 10, 0, 30);
  assert.equal(getLocalDate(localDate), '2026-11-10');
  assert.equal(getLocalDate(new Date(2026, 0, 2)), '2026-01-02');
  assert.throws(() => getLocalDate(new Date(Number.NaN)), RangeError);
});

test('parses calendar dates as local dates, including leap days and early years', () => {
  for (const value of ['0001-01-01', '0099-12-31', '2024-02-29', '2026-11-10', '2026-12-31']) {
    const date = parseTaskDate(value);
    assert.ok(date);
    assert.equal(getLocalDate(date), value);
    assert.equal(date.getHours(), 12);
  }
  assert.equal(parseTaskDate('2026-02-29'), null);
  assert.equal(parseTaskDate('2026-1-10'), null);
});

test('blocks mutations and UUID generation before initialization', (context) => {
  const uuid = context.mock.method(crypto, 'randomUUID');
  const store = useTaskStore(createPinia());
  const memory = createMemoryStorage();

  assert.equal(store.isReady, false);
  assert.equal(store.storageIssue, null);
  assert.equal(store.addTask('Задача', '2026-11-11'), null);
  assert.equal(store.setCompleted('missing', true), false);
  assert.equal(store.removeTask('missing'), false);
  assert.equal(store.resetStorage(), false);
  assert.equal(store.storageIssue, 'not-initialized');
  assert.deepEqual(store.tasks, []);
  assert.equal(uuid.mock.callCount(), 0);
  assert.equal(memory.state.loadCalls, 0);
  assert.equal(memory.state.saveCalls, 0);
  assert.equal(memory.state.resetCalls, 0);
});

test('initialization restores stored order and completion without writing', () => {
  const store = useTaskStore();
  const memory = createMemoryStorage([savedTask('second', true), savedTask('first')]);

  assert.equal(store.initialize(memory.port), true);
  assert.deepEqual(copyTasks(store.tasks), memory.state.tasks);
  assert.equal(store.isReady, true);
  assert.equal(store.storageIssue, null);
  assert.equal(memory.state.loadCalls, 1);
  assert.equal(memory.state.saveCalls, 0);
  assert.equal(memory.state.resetCalls, 0);
});

test('failed loads preserve the visible list and prevent silent overwrites until retry', () => {
  const store = useTaskStore();
  store.addTask('Предыдущая задача', '2026-11-11');
  const previous = copyTasks(store.tasks);
  const memory = createMemoryStorage([savedTask('restored')]);
  memory.state.loadIssue = 'invalid-data';

  assert.equal(store.initialize(memory.port), false);
  assert.equal(store.isReady, false);
  assert.equal(store.storageIssue, 'invalid-data');
  assert.deepEqual(copyTasks(store.tasks), previous);
  assert.equal(store.addTask('Новая задача', '2026-11-11'), null);
  assert.equal(store.setCompleted(previous[0]!.id, true), false);
  assert.equal(store.removeTask(previous[0]!.id), false);
  assert.equal(store.storageIssue, 'invalid-data');
  assert.equal(memory.state.saveCalls, 0);
  assert.deepEqual(copyTasks(store.tasks), previous);

  memory.state.loadIssue = null;
  assert.equal(store.initialize(), true);
  assert.deepEqual(copyTasks(store.tasks), memory.state.tasks);
  assert.equal(store.storageIssue, null);
  assert.equal(store.isReady, true);
  assert.equal(memory.state.loadCalls, 2);
  assert.equal(memory.state.saveCalls, 0);
});

for (const issue of ['quota-exceeded', 'unavailable', 'write-error'] as const) {
  test(`failed ${issue} writes leave additions, completion and deletion uncommitted`, () => {
    const store = useTaskStore();
    const memory = createMemoryStorage([savedTask('existing')]);
    store.initialize(memory.port);
    const previous = copyTasks(store.tasks);
    memory.state.saveIssue = issue;

    assert.equal(store.addTask('Не сохранена', '2026-11-11'), null);
    assert.deepEqual(copyTasks(store.tasks), previous);
    assert.equal(store.setCompleted('existing', true), false);
    assert.deepEqual(copyTasks(store.tasks), previous);
    assert.equal(store.removeTask('existing'), false);
    assert.deepEqual(copyTasks(store.tasks), previous);
    assert.deepEqual(memory.state.tasks, previous);
    assert.equal(memory.state.saveCalls, 3);
    assert.equal(store.storageIssue, issue);
    assert.equal(store.isReady, true);
  });
}

test('a successful retry commits the task and clears an earlier storage issue', () => {
  const store = useTaskStore();
  const memory = createMemoryStorage([savedTask('existing')]);
  store.initialize(memory.port);
  memory.state.saveIssue = 'quota-exceeded';
  assert.equal(store.addTask('Повторить', '2026-11-11'), null);

  memory.state.saveIssue = null;
  const task = store.addTask('Повторить', '2026-11-11');
  assert.ok(task);
  assert.equal(store.tasks[0]?.id, task.id);
  assert.deepEqual(copyTasks(store.tasks), memory.state.tasks);
  assert.equal(store.storageIssue, null);
  assert.equal(store.isReady, true);
});

for (const issue of ['conflict', 'not-initialized'] as const) {
  test(`${issue} blocks subsequent writes until reloading the storage`, () => {
    const store = useTaskStore();
    const memory = createMemoryStorage([savedTask('old')]);
    store.initialize(memory.port);
    memory.state.tasks = [savedTask('external')];
    memory.state.saveIssue = issue;

    assert.equal(store.addTask('Не сохранена', '2026-11-11'), null);
    assert.equal(store.isReady, false);
    assert.equal(store.storageIssue, issue);
    assert.equal(store.addTask('Снова', '2026-11-11'), null);
    assert.equal(store.setCompleted('old', true), false);
    assert.equal(store.removeTask('old'), false);
    assert.equal(memory.state.saveCalls, 1);
    assert.deepEqual(
      store.tasks.map((task) => task.id),
      ['old'],
    );

    memory.state.saveIssue = null;
    assert.equal(store.initialize(), true);
    assert.deepEqual(
      store.tasks.map((task) => task.id),
      ['external'],
    );
    assert.ok(store.addTask('После загрузки', '2026-11-11'));
    assert.equal(store.storageIssue, null);
    assert.deepEqual(copyTasks(store.tasks), memory.state.tasks);
  });
}

test('unknown tasks and unchanged completion do not write or hide older errors', () => {
  const store = useTaskStore();
  const memory = createMemoryStorage([savedTask('existing')]);
  store.initialize(memory.port);
  memory.state.saveIssue = 'quota-exceeded';
  assert.equal(store.addTask('Не сохранена', '2026-11-11'), null);
  const previousCalls = memory.state.saveCalls;

  assert.equal(store.setCompleted('missing', true), false);
  assert.equal(store.removeTask('missing'), false);
  assert.equal(store.setCompleted('existing', false), true);
  assert.equal(memory.state.saveCalls, previousCalls);
  assert.equal(store.storageIssue, 'quota-exceeded');
});

test('explicit reset recovers from a failed load and clears stored and visible tasks', () => {
  const store = useTaskStore();
  store.addTask('Предыдущая задача', '2026-11-11');
  const memory = createMemoryStorage([savedTask('corrupt')]);
  memory.state.loadIssue = 'invalid-data';
  assert.equal(store.initialize(memory.port), false);

  assert.equal(store.resetStorage(), true);
  assert.equal(memory.state.resetCalls, 1);
  assert.equal(memory.state.saveCalls, 0);
  assert.deepEqual(memory.state.tasks, []);
  assert.deepEqual(store.tasks, []);
  assert.equal(store.isReady, true);
  assert.equal(store.storageIssue, null);
});

test('failed reset preserves the last saved list and its readiness unless a conflict occurs', () => {
  const store = useTaskStore();
  const memory = createMemoryStorage([savedTask('existing')]);
  store.initialize(memory.port);
  const previous = copyTasks(store.tasks);
  memory.state.resetIssue = 'quota-exceeded';

  assert.equal(store.resetStorage(), false);
  assert.deepEqual(copyTasks(store.tasks), previous);
  assert.deepEqual(memory.state.tasks, previous);
  assert.equal(store.isReady, true);
  assert.equal(store.storageIssue, 'quota-exceeded');

  memory.state.resetIssue = 'conflict';
  assert.equal(store.resetStorage(), false);
  assert.equal(store.isReady, false);
  assert.deepEqual(copyTasks(store.tasks), previous);
  memory.state.resetIssue = null;
  assert.equal(store.resetStorage(), true);
  assert.deepEqual(store.tasks, []);
  assert.equal(store.isReady, true);
  assert.equal(store.storageIssue, null);
});
