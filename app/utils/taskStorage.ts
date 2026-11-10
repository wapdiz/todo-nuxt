import { TASK_TITLE_MAX_LENGTH, type Task } from '../types/task';
import { isTaskDate } from '../../shared/utils/taskDate';

export const TASK_STORAGE_KEY = 'todo-nuxt:tasks:v1';

export type TaskStorageIssue =
  | 'unavailable'
  | 'invalid-data'
  | 'unsupported-version'
  | 'quota-exceeded'
  | 'write-error'
  | 'conflict'
  | 'not-initialized';

export type TaskLoadResult = { ok: true; tasks: Task[] } | { ok: false; issue: TaskStorageIssue };
export type TaskSaveResult = { ok: true } | { ok: false; issue: TaskStorageIssue };

export interface TaskStorage {
  load(): TaskLoadResult;
  save(tasks: readonly Task[]): TaskSaveResult;
  reset(): TaskSaveResult;
}

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeTasks(value: unknown): Task[] | null {
  if (!Array.isArray(value)) return null;

  const ids = new Set<string>();
  const tasks: Task[] = [];

  try {
    for (const item of value) {
      if (
        !isRecord(item) ||
        typeof item.id !== 'string' ||
        !item.id ||
        item.id !== item.id.trim() ||
        ids.has(item.id) ||
        typeof item.title !== 'string' ||
        !item.title ||
        item.title !== item.title.trim() ||
        item.title.length > TASK_TITLE_MAX_LENGTH ||
        typeof item.completed !== 'boolean' ||
        typeof item.scheduledDate !== 'string' ||
        !isTaskDate(item.scheduledDate) ||
        typeof item.createdAt !== 'string'
      ) {
        return null;
      }

      const createdAt = new Date(item.createdAt);
      if (Number.isNaN(createdAt.getTime()) || createdAt.toISOString() !== item.createdAt) return null;

      ids.add(item.id);
      tasks.push({
        id: item.id,
        title: item.title,
        completed: item.completed,
        scheduledDate: item.scheduledDate,
        createdAt: item.createdAt,
      });
    }
  } catch {
    return null;
  }

  return tasks;
}

function writeIssue(error: unknown): TaskStorageIssue {
  try {
    if (isRecord(error) || error instanceof Error) {
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') return 'quota-exceeded';
      if (error.name === 'SecurityError') return 'unavailable';
    }
  } catch {
    return 'write-error';
  }

  return 'write-error';
}

export function createTaskStorage(getStorage: () => StoragePort = () => window.localStorage): TaskStorage {
  let snapshot: string | null = null;
  let hasSnapshot = false;
  let canSave = false;

  function load(): TaskLoadResult {
    hasSnapshot = false;
    canSave = false;

    try {
      snapshot = getStorage().getItem(TASK_STORAGE_KEY);
      hasSnapshot = true;
    } catch {
      return { ok: false, issue: 'unavailable' };
    }

    if (snapshot === null) {
      canSave = true;
      return { ok: true, tasks: [] };
    }

    let envelope: unknown;
    try {
      envelope = JSON.parse(snapshot);
    } catch {
      return { ok: false, issue: 'invalid-data' };
    }

    if (!isRecord(envelope) || typeof envelope.version !== 'number') return { ok: false, issue: 'invalid-data' };
    if (envelope.version !== 1) return { ok: false, issue: 'unsupported-version' };

    const tasks = normalizeTasks(envelope.tasks);
    if (!tasks) return { ok: false, issue: 'invalid-data' };

    canSave = true;
    return { ok: true, tasks };
  }

  function write(tasks: Task[], allowReset = false): TaskSaveResult {
    if (!hasSnapshot || (!allowReset && !canSave)) return { ok: false, issue: 'not-initialized' };

    let storage: StoragePort;
    let current: string | null;
    try {
      storage = getStorage();
      current = storage.getItem(TASK_STORAGE_KEY);
    } catch {
      return { ok: false, issue: 'unavailable' };
    }

    if (current !== snapshot) {
      hasSnapshot = false;
      canSave = false;
      return { ok: false, issue: 'conflict' };
    }

    const serialized = JSON.stringify({ version: 1, tasks });
    try {
      storage.setItem(TASK_STORAGE_KEY, serialized);
    } catch (error) {
      return { ok: false, issue: writeIssue(error) };
    }

    snapshot = serialized;
    hasSnapshot = true;
    canSave = true;
    return { ok: true };
  }

  function save(value: readonly Task[]): TaskSaveResult {
    if (!canSave) return { ok: false, issue: 'not-initialized' };
    const tasks = normalizeTasks(value);
    if (!tasks) return { ok: false, issue: 'invalid-data' };
    return write(tasks);
  }

  return { load, save, reset: () => write([], true) };
}
