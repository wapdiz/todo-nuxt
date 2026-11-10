import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Task } from '../app/types/task';
import {
  filterTasksByView,
  getNextVisibleTaskId,
  getTaskDates,
  getTasksForDate,
  moveTaskId,
  reorderTasksForDate,
  updateDragOrder,
} from '../app/utils/taskCalendar';
import { getLocalDate, parseTaskDate } from '../shared/utils/taskDate';

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

test('reorders tasks for a single date without moving tasks from other dates', () => {
  const tasks = Object.freeze([
    Object.freeze(task('future', '2026-11-12')),
    Object.freeze(task('a', '2026-11-11', true)),
    Object.freeze(task('past', '2026-11-10')),
    Object.freeze(task('b', '2026-11-11')),
    Object.freeze(task('c', '2026-11-11')),
  ]);

  const reordered = reorderTasksForDate(tasks, '2026-11-11', ['c', 'a', 'b']);
  assert.ok(reordered);
  assert.deepEqual(
    reordered.map((item) => item.id),
    ['future', 'c', 'past', 'a', 'b'],
  );
  assert.deepEqual(
    getTasksForDate(reordered, '2026-11-11').map((item) => item.id),
    ['c', 'a', 'b'],
  );
  assert.equal(reordered[1]?.completed, false);
  assert.equal(reordered[3]?.completed, true);
  assert.deepEqual(
    tasks.map((item) => item.id),
    ['future', 'a', 'past', 'b', 'c'],
  );
});

test('rejects invalid dates, incomplete lists, duplicates and foreign ids when reordering', () => {
  const tasks = [task('a', '2026-11-11'), task('b', '2026-11-11'), task('other', '2026-11-12')];

  assert.equal(reorderTasksForDate(tasks, '2026-02-29', ['a', 'b']), null);
  assert.equal(reorderTasksForDate(tasks, '2026-11-11', ['a']), null);
  assert.equal(reorderTasksForDate(tasks, '2026-11-11', ['a', 'a']), null);
  assert.equal(reorderTasksForDate(tasks, '2026-11-11', ['a', 'other']), null);
  assert.equal(reorderTasksForDate(tasks, '2026-11-11', ['a', 'b', 'other']), null);
  assert.deepEqual(
    reorderTasksForDate(tasks, '2026-11-10', [])?.map((item) => item.id),
    ['a', 'b', 'other'],
  );
});

test('moves a task id one slot at a time within list boundaries', () => {
  const ids = Object.freeze(['a', 'b', 'c']);
  assert.deepEqual(moveTaskId(ids, 'b', -1), ['b', 'a', 'c']);
  assert.deepEqual(moveTaskId(ids, 'b', 1), ['a', 'c', 'b']);
  assert.equal(moveTaskId(ids, 'a', -1), null);
  assert.equal(moveTaskId(ids, 'c', 1), null);
  assert.equal(moveTaskId(ids, 'missing', 1), null);
  assert.deepEqual(ids, ['a', 'b', 'c']);
});

test('updates drag order smoothly across unequal heights and multi-slot jumps', () => {
  const slots = [
    { id: 'short-top', height: 58 },
    { id: 'tall-middle', height: 140 },
    { id: 'short-bottom', height: 58 },
  ];

  const movedDownPastTall = updateDragOrder(slots, 'short-top', 80, 5);
  assert.deepEqual(
    movedDownPastTall.map((slot) => slot.id),
    ['tall-middle', 'short-top', 'short-bottom'],
  );
  assert.deepEqual(
    updateDragOrder(movedDownPastTall, 'short-top', 80, 5).map((slot) => slot.id),
    ['tall-middle', 'short-top', 'short-bottom'],
  );

  const jumpedToBottom = updateDragOrder(slots, 'short-top', 220, 5);
  assert.deepEqual(
    jumpedToBottom.map((slot) => slot.id),
    ['tall-middle', 'short-bottom', 'short-top'],
  );

  const tallMovedUp = updateDragOrder(slots, 'tall-middle', 20, 5);
  assert.deepEqual(
    tallMovedUp.map((slot) => slot.id),
    ['tall-middle', 'short-top', 'short-bottom'],
  );
  assert.deepEqual(
    updateDragOrder(tallMovedUp, 'tall-middle', 20, 5).map((slot) => slot.id),
    ['tall-middle', 'short-top', 'short-bottom'],
  );
});

test('filterTasksByView filters by completion status without mutating day order', () => {
  const dayTasks = [
    task('active-1', '2026-11-11', false),
    task('done-1', '2026-11-11', true),
    task('active-2', '2026-11-11', false),
  ];

  assert.deepEqual(
    filterTasksByView(dayTasks, 'all').map((item) => item.id),
    ['active-1', 'done-1', 'active-2'],
  );
  assert.deepEqual(
    filterTasksByView(dayTasks, 'active').map((item) => item.id),
    ['active-1', 'active-2'],
  );
  assert.deepEqual(
    filterTasksByView(dayTasks, 'completed').map((item) => item.id),
    ['done-1'],
  );
  assert.equal(getNextVisibleTaskId(filterTasksByView(dayTasks, 'active'), 'active-1'), 'active-2');
});
