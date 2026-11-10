export type AiChatMode = 'chat' | 'create_tasks' | 'split_task';

export type AiChatRole = 'user' | 'assistant';

export interface AiChatHistoryItem {
  role: AiChatRole;
  text: string;
}

export interface AiTaskContextItem {
  id: string;
  title: string;
  completed: boolean;
  scheduledDate: string;
}

export interface AiProposedTaskItem {
  title: string;
  scheduledDate: string;
}

export interface AiProposalAddTasks {
  id: string;
  type: 'add_tasks';
  summary: string;
  tasks: AiProposedTaskItem[];
}

export interface AiProposalSplitTask {
  id: string;
  type: 'split_task';
  summary: string;
  sourceTaskId?: string;
  sourceTitle: string;
  scheduledDate: string;
  steps: AiProposedTaskItem[];
}

export type AiProposedAction = AiProposalAddTasks | AiProposalSplitTask;

export interface AiChatRequest {
  message: string;
  mode: AiChatMode;
  activeDate: string;
  todayDate: string;
  tasks: AiTaskContextItem[];
  history: AiChatHistoryItem[];
}

export interface AiChatResponse {
  reply: string;
  proposals: AiProposedAction[];
}
