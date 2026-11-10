import type { Task } from '../types/task';
import { isTaskDate } from '../../shared/utils/taskDate';

export type TaskViewFilter = 'all' | 'active' | 'completed';

export function getTasksForDate(tasks: readonly Task[], date: string): Task[] {
  if (!isTaskDate(date)) return [];
  return tasks.filter((task) => task.scheduledDate === date);
}

export function filterTasksByView(tasks: readonly Task[], filter: TaskViewFilter): Task[] {
  if (filter === 'active') return tasks.filter((task) => !task.completed);
  if (filter === 'completed') return tasks.filter((task) => task.completed);
  return [...tasks];
}

export function getTaskDates(tasks: readonly Task[]): string[] {
  return [...new Set(tasks.map((task) => task.scheduledDate).filter(isTaskDate))].sort();
}

export function getNextVisibleTaskId(tasks: readonly Task[], removedId: string): string | null {
  const index = tasks.findIndex((task) => task.id === removedId);
  if (index === -1) return null;
  return tasks[index + 1]?.id ?? tasks[index - 1]?.id ?? null;
}

export interface TaskDragSlot {
  id: string;
  height: number;
}

export function reorderTasksForDate(
  tasks: readonly Task[],
  date: string,
  orderedIds: readonly string[],
): Task[] | null {
  if (!isTaskDate(date)) return null;

  const dateTasks = tasks.filter((task) => task.scheduledDate === date);
  if (orderedIds.length !== dateTasks.length) return null;

  const byId = new Map(dateTasks.map((task) => [task.id, task]));
  const seen = new Set<string>();
  const reorderedDateTasks: Task[] = [];

  for (const id of orderedIds) {
    if (seen.has(id)) return null;
    const task = byId.get(id);
    if (!task) return null;
    seen.add(id);
    reorderedDateTasks.push(task);
  }

  let cursor = 0;
  return tasks.map((task) => (task.scheduledDate === date ? reorderedDateTasks[cursor++]! : task));
}

export function moveTaskId(ids: readonly string[], id: string, offset: -1 | 1): string[] | null {
  const index = ids.indexOf(id);
  const targetIndex = index + offset;
  if (index === -1 || targetIndex < 0 || targetIndex >= ids.length) return null;

  const next = [...ids];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved!);
  return next;
}

function getSlotTop(slots: readonly TaskDragSlot[], targetIndex: number, gap: number): number {
  let top = 0;
  for (let i = 0; i < targetIndex; i++) {
    top += slots[i]!.height + gap;
  }
  return top;
}

export function updateDragOrder(
  slots: readonly TaskDragSlot[],
  draggedId: string,
  visualTop: number,
  gap: number,
): TaskDragSlot[] {
  let index = slots.findIndex((slot) => slot.id === draggedId);
  if (index === -1) return [...slots];

  const safeGap = Math.max(0, gap);
  const next = [...slots];
  const dragged = next[index]!;
  const visualBottom = visualTop + dragged.height;
  let movedUp = false;

  while (index > 0) {
    const prev = next[index - 1]!;
    const prevMid = getSlotTop(next, index - 1, safeGap) + prev.height / 2;
    if (visualTop >= prevMid) break;
    next[index - 1] = dragged;
    next[index] = prev;
    index--;
    movedUp = true;
  }

  if (!movedUp) {
    while (index < next.length - 1) {
      const after = next[index + 1]!;
      const afterMid = getSlotTop(next, index + 1, safeGap) + after.height / 2;
      if (visualBottom <= afterMid) break;
      next[index + 1] = dragged;
      next[index] = after;
      index++;
    }
  }

  return next;
}
