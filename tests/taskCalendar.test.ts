import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Task } from '../app/types/task';
import { getNextVisibleTaskId, getTaskDates, getTasksForDate } from '../app/utils/taskCalendar';
import { getLocalDate, parseTaskDate } from '../app/utils/taskDate';

function task(id: string, scheduledDate: string, completed = false): Task {
  return { id, title: `Task ${id}`, scheduledDate, completed, createdAt: '2026-11-11T12:00:00.000Z' };
}

test('filters the exact day without losing completion, order or changing source tasks', () => {
  const tasks = Object.freeze([
    Object.freeze(task('future', '2026-11-12')),
    Object.freeze(task('newest', '2026-11-11', true)),
    Object.freeze(task('past', '2026-11-10')),
    Object.freeze(task('older', '2026-11-11')),
  ]);

  const visible = getTasksForDate(tasks, '2026-11-11');
  assert.deepEqual(
    visible.map((item) => item.id),
    ['newest', 'older'],
  );
  assert.equal(visible[0]?.completed, true);
  assert.equal(visible[1]?.completed, false);
  assert.equal(visible[0], tasks[1]);
  assert.deepEqual(
    getTasksForDate(tasks, '2026-11-10').map((item) => item.id),
    ['past'],
  );
  assert.deepEqual(
    getTasksForDate(tasks, '2026-11-12').map((item) => item.id),
    ['future'],
  );
  assert.equal(tasks.length, 4);
});

test('an empty day, invalid selection or empty list produces no visible tasks', () => {
  const tasks = [task('one', '2026-11-11')];
  for (const date of ['', '2026-11-1', '2026-02-29', '2026-11-11T12:00:00Z', '2026-11-10']) {
    assert.deepEqual(getTasksForDate(tasks, date), [], date);
  }
  assert.deepEqual(getTasksForDate([], '2026-11-11'), []);
});

test('marked dates are unique, chronological and include dates of completed tasks', () => {
  const tasks = [
    task('next-year', '2027-01-01'),
    task('completed', '2026-11-10', true),
    task('same-day', '2026-11-10'),
    task('december', '2026-12-31'),
    task('invalid', '2026-02-29'),
    task('noncanonical', '2026-1-01'),
  ];

  assert.deepEqual(getTaskDates(tasks), ['2026-11-10', '2026-12-31', '2027-01-01']);
  assert.equal(tasks[0]?.id, 'next-year');
  assert.deepEqual(getTaskDates([]), []);
});

test('deletion chooses the next visible task, otherwise the previous task or no target', () => {
  const tasks = [task('first', '2026-11-11'), task('middle', '2026-11-11'), task('last', '2026-11-11')];
  assert.equal(getNextVisibleTaskId(tasks, 'first'), 'middle');
  assert.equal(getNextVisibleTaskId(tasks, 'middle'), 'last');
  assert.equal(getNextVisibleTaskId(tasks, 'last'), 'middle');
  assert.equal(getNextVisibleTaskId([tasks[0]!], 'first'), null);
  assert.equal(getNextVisibleTaskId(tasks, 'missing'), null);
  assert.equal(getNextVisibleTaskId([], 'missing'), null);
});

test('focus targets never come from another day when applying the filtered list', () => {
  const tasks = [
    task('other-before', '2026-11-10'),
    task('visible-first', '2026-11-11'),
    task('other-between', '2026-11-12'),
    task('visible-last', '2026-11-11'),
    task('other-after', '2026-11-10'),
  ];
  const visible = getTasksForDate(tasks, '2026-11-11');

  assert.equal(getNextVisibleTaskId(visible, 'visible-first'), 'visible-last');
  assert.equal(getNextVisibleTaskId(visible, 'visible-last'), 'visible-first');
  assert.equal(getNextVisibleTaskId(getTasksForDate(tasks, '2026-11-12'), 'other-between'), null);
});

test('local date round-trip remains stable across December and January', () => {
  const date = parseTaskDate('2026-12-31');
  assert.ok(date);
  assert.equal(getLocalDate(date), '2026-12-31');
  date.setDate(date.getDate() + 1);
  assert.equal(getLocalDate(date), '2027-01-01');
  assert.deepEqual(getTaskDates([task('january', getLocalDate(date)), task('december', '2026-12-31')]), [
    '2026-12-31',
    '2027-01-01',
  ]);
});

test('local dates distinguish leap February from a non-leap February', () => {
  const leap = parseTaskDate('2024-02-28');
  assert.ok(leap);
  leap.setDate(leap.getDate() + 1);
  assert.equal(getLocalDate(leap), '2024-02-29');
  leap.setDate(leap.getDate() + 1);
  assert.equal(getLocalDate(leap), '2024-03-01');

  const ordinary = parseTaskDate('2026-02-28');
  assert.ok(ordinary);
  ordinary.setDate(ordinary.getDate() + 1);
  assert.equal(getLocalDate(ordinary), '2026-03-01');
  assert.equal(parseTaskDate('2026-02-29'), null);
});
