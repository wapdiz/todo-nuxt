import { defineStore } from 'pinia';
import { ref } from 'vue';
import { TASK_TITLE_MAX_LENGTH, type Task } from '../types/task';
import { reorderTasksForDate } from '../utils/taskCalendar';
import { isTaskDate } from '../utils/taskDate';
import { createTaskStorage, type TaskStorage, type TaskStorageIssue } from '../utils/taskStorage';

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const isReady = ref(false);
  const storageIssue = ref<TaskStorageIssue | null>(null);
  let storagePort: TaskStorage | null = null;

  function initialize(storage?: TaskStorage): boolean {
    storagePort = storage ?? storagePort ?? createTaskStorage();
    isReady.value = false;
    const result = storagePort.load();

    if (!result.ok) {
      storageIssue.value = result.issue;
      return false;
    }

    tasks.value = result.tasks;
    storageIssue.value = null;
    isReady.value = true;
    return true;
  }

  function canMutate(): boolean {
    if (isReady.value && storagePort) return true;
    storageIssue.value ??= 'not-initialized';
    return false;
  }

  function reportStorageIssue(issue: TaskStorageIssue): void {
    storageIssue.value = issue;
    if (issue === 'conflict' || issue === 'not-initialized') isReady.value = false;
  }

  function commit(candidate: Task[]): boolean {
    if (!storagePort) return false;
    const result = storagePort.save(candidate);

    if (!result.ok) {
      reportStorageIssue(result.issue);
      return false;
    }

    tasks.value = candidate;
    storageIssue.value = null;
    return true;
  }

  function addTask(title: string, scheduledDate: string): Task | null {
    if (!canMutate()) return null;
    const normalizedTitle = title.trim();
    if (!normalizedTitle || normalizedTitle.length > TASK_TITLE_MAX_LENGTH || !isTaskDate(scheduledDate)) return null;

    const task: Task = {
      id: crypto.randomUUID(),
      title: normalizedTitle,
      completed: false,
      scheduledDate,
      createdAt: new Date().toISOString(),
    };

    return commit([task, ...tasks.value]) ? task : null;
  }

  function setCompleted(id: string, completed: boolean): boolean {
    if (!canMutate()) return false;
    const task = tasks.value.find((item) => item.id === id);
    if (!task) return false;
    if (task.completed === completed) return true;
    return commit(tasks.value.map((item) => (item.id === id ? { ...item, completed } : item)));
  }

  function removeTask(id: string): boolean {
    if (!canMutate()) return false;
    if (!tasks.value.some((item) => item.id === id)) return false;
    return commit(tasks.value.filter((item) => item.id !== id));
  }

  function reorderTasks(scheduledDate: string, orderedIds: readonly string[]): boolean {
    if (!canMutate()) return false;
    const candidate = reorderTasksForDate(tasks.value, scheduledDate, orderedIds);
    if (!candidate) return false;
    if (candidate.every((task, index) => task === tasks.value[index])) return true;
    return commit(candidate);
  }

  function resetStorage(): boolean {
    if (!storagePort) {
      storageIssue.value = 'not-initialized';
      return false;
    }

    const result = storagePort.reset();
    if (!result.ok) {
      reportStorageIssue(result.issue);
      return false;
    }

    tasks.value = [];
    storageIssue.value = null;
    isReady.value = true;
    return true;
  }

  return { tasks, isReady, storageIssue, initialize, addTask, setCompleted, removeTask, reorderTasks, resetStorage };
});
