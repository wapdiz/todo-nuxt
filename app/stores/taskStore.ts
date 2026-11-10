import { defineStore } from 'pinia';
import { ref } from 'vue';
import { TASK_TITLE_MAX_LENGTH, type Task } from '../types/task';
import { isTaskDate } from '../utils/taskDate';

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);

  function addTask(title: string, scheduledDate: string): Task | null {
    const normalizedTitle = title.trim();
    if (!normalizedTitle || normalizedTitle.length > TASK_TITLE_MAX_LENGTH || !isTaskDate(scheduledDate)) return null;

    const task: Task = {
      id: crypto.randomUUID(),
      title: normalizedTitle,
      completed: false,
      scheduledDate,
      createdAt: new Date().toISOString(),
    };

    tasks.value.unshift(task);
    return task;
  }

  function setCompleted(id: string, completed: boolean): boolean {
    const task = tasks.value.find((item) => item.id === id);
    if (!task) return false;
    task.completed = completed;
    return true;
  }

  function removeTask(id: string): boolean {
    const index = tasks.value.findIndex((item) => item.id === id);
    if (index === -1) return false;
    tasks.value.splice(index, 1);
    return true;
  }

  return { tasks, addTask, setCompleted, removeTask };
});
