export const TASK_TITLE_MAX_LENGTH = 200;

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  scheduledDate: string;
  createdAt: string;
}
