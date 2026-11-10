import type { Task } from '../types/task';
import { isTaskDate } from './taskDate';

export function getTasksForDate(tasks: readonly Task[], date: string): Task[] {
  if (!isTaskDate(date)) return [];
  return tasks.filter((task) => task.scheduledDate === date);
}

export function getTaskDates(tasks: readonly Task[]): string[] {
  return [...new Set(tasks.map((task) => task.scheduledDate).filter(isTaskDate))].sort();
}

export function getNextVisibleTaskId(tasks: readonly Task[], removedId: string): string | null {
  const index = tasks.findIndex((task) => task.id === removedId);
  if (index === -1) return null;
  return tasks[index + 1]?.id ?? tasks[index - 1]?.id ?? null;
}
