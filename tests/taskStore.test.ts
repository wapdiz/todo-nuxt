import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { useTaskStore } from '../app/stores/taskStore';
import { TASK_TITLE_MAX_LENGTH } from '../app/types/task';
import { getLocalDate, isTaskDate, parseTaskDate } from '../app/utils/taskDate';

beforeEach(() => {
  setActivePinia(createPinia());
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
