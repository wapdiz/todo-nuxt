import type {
  AiChatHistoryItem,
  AiChatMode,
  AiChatRequest,
  AiChatResponse,
  AiProposedAction,
  AiProposedTaskItem,
} from '../../shared/types/aiChat';
import {
  AI_MAX_CONTEXT_TASKS,
  AI_MAX_HISTORY_ITEMS,
  AI_MAX_HISTORY_TEXT_LENGTH,
  AI_MAX_MESSAGE_LENGTH,
} from '../../shared/utils/aiChat';
import type { Task } from '../types/task';

export type AiProposalStatus = 'pending' | 'applying' | 'applied' | 'dismissed';

export interface AiChatProposalState {
  proposal: AiProposedAction;
  contextDate: string;
  status: AiProposalStatus;
  appliedCount: number;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  contextDate: string;
  proposals: AiChatProposalState[];
}

export interface AiChatSendInput {
  text: string;
  mode: AiChatMode;
  activeDate: string;
  todayDate: string;
  dayTasks: readonly Task[];
}

export interface AiChatServiceDeps {
  sendRequest: (payload: AiChatRequest, signal: AbortSignal) => Promise<AiChatResponse>;
  applyTasks: (items: ReadonlyArray<AiProposedTaskItem>) => Task[] | null;
  createState?: (initial: AiChatServiceState) => AiChatServiceState;
  onNotify?: () => void;
  nextId?: () => string;
}

export interface AiChatServiceState {
  messages: AiChatMessage[];
  isPending: boolean;
  error: string;
}

export interface AiComposerState {
  draft: string;
  activeMode: AiChatMode;
  isSplitPickerOpen: boolean;
}

export function createAiComposerController(deps?: { createState?: (initial: AiComposerState) => AiComposerState }) {
  const initialState: AiComposerState = {
    draft: '',
    activeMode: 'chat',
    isSplitPickerOpen: false,
  };
  const state = deps?.createState ? deps.createState(initialState) : initialState;

  function canSend(isPending: boolean): boolean {
    const trimmed = state.draft.trim();
    return !isPending && trimmed.length > 0 && trimmed.length <= AI_MAX_MESSAGE_LENGTH;
  }

  function submit(isPending: boolean): { text: string; mode: AiChatMode } | null {
    if (!canSend(isPending)) return null;
    const text = state.draft.trim();
    const mode = state.activeMode;
    state.draft = '';
    state.activeMode = 'chat';
    state.isSplitPickerOpen = false;
    return { text, mode };
  }

  function prepareCreateFromText() {
    state.isSplitPickerOpen = false;
    state.activeMode = 'create_tasks';
    if (!state.draft.trim()) {
      state.draft = 'Добавь задачи: ';
    }
  }

  function toggleSplitPicker(hasDayTasks: boolean): boolean {
    if (!hasDayTasks) {
      state.isSplitPickerOpen = false;
      state.activeMode = 'split_task';
      if (!state.draft.trim()) {
        state.draft = 'Разбей на шаги задачу: ';
      }
      return false;
    }
    state.isSplitPickerOpen = !state.isSplitPickerOpen;
    return true;
  }

  function prepareSplitTask(taskTitle: string): { text: string; mode: 'split_task' } {
    state.isSplitPickerOpen = false;
    state.activeMode = 'chat';
    return { text: `Разбей задачу на шаги: ${taskTitle}`, mode: 'split_task' };
  }

  function restoreDraft(text: string, mode: AiChatMode = 'chat') {
    if (!state.draft.trim()) {
      state.draft = text;
      state.activeMode = mode;
    }
  }

  function closeSplitPicker() {
    state.isSplitPickerOpen = false;
  }

  function reset() {
    state.isSplitPickerOpen = false;
    state.activeMode = 'chat';
  }

  return {
    state,
    canSend,
    submit,
    prepareCreateFromText,
    toggleSplitPicker,
    prepareSplitTask,
    restoreDraft,
    closeSplitPicker,
    reset,
  };
}

function buildBoundedHistory(messages: readonly AiChatMessage[]): AiChatHistoryItem[] {
  return messages
    .filter((entry) => entry.text.trim().length > 0)
    .slice(-AI_MAX_HISTORY_ITEMS)
    .map((entry) => ({
      role: entry.role,
      text: entry.text.trim().slice(0, AI_MAX_HISTORY_TEXT_LENGTH).trim(),
    }));
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const statusCode =
      ('statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : undefined) ??
      ('status' in err && typeof err.status === 'number' ? err.status : undefined);
    const data = 'data' in err && typeof err.data === 'object' && err.data !== null ? err.data : undefined;
    const serverMessage =
      data && 'message' in data && typeof data.message === 'string' && data.message.trim()
        ? data.message.trim()
        : undefined;

    if (statusCode === 429) {
      return serverMessage || 'Слишком много запросов. Подождите немного и попробуйте снова.';
    }
    if (statusCode === 503) {
      return serverMessage || 'ИИ-ассистент не настроен на сервере.';
    }
    if (statusCode === 408 || statusCode === 504) {
      return serverMessage || 'Ассистент не успел ответить вовремя. Повторите запрос.';
    }
    if (serverMessage) return serverMessage;
    if ('message' in err && typeof err.message === 'string' && err.message.trim() && statusCode) {
      return err.message.trim();
    }
  }
  return 'Не удалось получить ответ ассистента. Проверьте подключение и повторите попытку.';
}

export function getProposalItems(proposal: AiProposedAction): readonly AiProposedTaskItem[] {
  return proposal.type === 'add_tasks' ? proposal.tasks : proposal.steps;
}

export function createAiChatService(deps: AiChatServiceDeps) {
  let idCounter = 0;
  let proposalCounter = 0;
  const nextId = deps.nextId ?? (() => `ai-msg-${++idCounter}`);
  const nextProposalId = () => `ai-proposal-${++proposalCounter}`;
  let epoch = 0;
  let activeRequestId = 0;
  let activeController: AbortController | null = null;

  const initialState: AiChatServiceState = {
    messages: [],
    isPending: false,
    error: '',
  };
  // Через createState подключаем reactive() в UI, сохраняя прямой вызов сервиса в чистых unit-тестах.
  const state = deps.createState ? deps.createState(initialState) : initialState;

  function notify() {
    deps.onNotify?.();
  }

  async function sendMessage(input: AiChatSendInput): Promise<boolean> {
    if (state.isPending) return false;

    const normalized = input.text.trim();
    if (!normalized) {
      state.error = 'Введите текст запроса.';
      notify();
      return false;
    }
    if (normalized.length > AI_MAX_MESSAGE_LENGTH) {
      state.error = `Запрос не должен превышать ${AI_MAX_MESSAGE_LENGTH} символов.`;
      notify();
      return false;
    }

    const requestEpoch = epoch;
    const requestId = ++activeRequestId;
    const contextDate = input.activeDate;
    const history = buildBoundedHistory(state.messages);
    const tasksSnapshot = input.dayTasks.slice(0, AI_MAX_CONTEXT_TASKS).map((task) => ({
      id: task.id,
      title: task.title,
      completed: task.completed,
      scheduledDate: task.scheduledDate,
    }));

    const payload: AiChatRequest = {
      message: normalized,
      mode: input.mode,
      activeDate: contextDate,
      todayDate: input.todayDate,
      tasks: tasksSnapshot,
      history,
    };

    const userMessageId = nextId();
    state.messages.push({
      id: userMessageId,
      role: 'user',
      text: normalized,
      contextDate,
      proposals: [],
    });
    state.isPending = true;
    state.error = '';
    notify();

    const controller = new AbortController();
    activeController = controller;

    try {
      const response = await deps.sendRequest(payload, controller.signal);
      if (requestEpoch !== epoch || requestId !== activeRequestId) return false;

      state.messages.push({
        id: nextId(),
        role: 'assistant',
        text: response.reply,
        contextDate,
        proposals: response.proposals.map((proposal) => ({
          proposal: {
            ...proposal,
            id: nextProposalId(),
          },
          contextDate,
          status: 'pending',
          appliedCount: 0,
        })),
      });
      notify();
      return true;
    } catch (err: unknown) {
      if (requestEpoch !== epoch || requestId !== activeRequestId) return false;
      state.messages = state.messages.filter((item) => item.id !== userMessageId);
      if (err instanceof Error && err.name === 'AbortError') return false;

      state.error = extractErrorMessage(err);
      notify();
      return false;
    } finally {
      if (requestEpoch === epoch && requestId === activeRequestId) {
        state.isPending = false;
        activeController = null;
        notify();
      }
    }
  }

  function findProposal(messageId: string, proposalId: string): AiChatProposalState | null {
    const message = state.messages.find((item) => item.id === messageId);
    if (!message) return null;
    return message.proposals.find((item) => item.proposal.id === proposalId) ?? null;
  }

  function applyProposal(
    messageId: string,
    proposalId: string,
    selectedIndices?: readonly number[],
  ):
    | { ok: true; created: Task[] }
    | { ok: false; reason: 'not-found' | 'already-handled' | 'nothing-selected' | 'storage-failed' } {
    const target = findProposal(messageId, proposalId);
    if (!target) return { ok: false, reason: 'not-found' };
    if (target.status !== 'pending') return { ok: false, reason: 'already-handled' };

    const allItems = getProposalItems(target.proposal);
    const itemsToAdd =
      selectedIndices === undefined
        ? [...allItems]
        : allItems.filter((_item, index) => selectedIndices.includes(index));

    if (itemsToAdd.length === 0) return { ok: false, reason: 'nothing-selected' };

    target.status = 'applying';
    notify();

    const created = deps.applyTasks(itemsToAdd);
    if (!created) {
      target.status = 'pending';
      notify();
      return { ok: false, reason: 'storage-failed' };
    }

    target.status = 'applied';
    target.appliedCount = created.length;
    notify();
    return { ok: true, created };
  }

  function dismissProposal(messageId: string, proposalId: string): boolean {
    const target = findProposal(messageId, proposalId);
    if (!target || target.status !== 'pending') return false;
    target.status = 'dismissed';
    notify();
    return true;
  }

  function clearChat() {
    epoch += 1;
    activeRequestId += 1;
    activeController?.abort();
    activeController = null;
    state.messages = [];
    state.isPending = false;
    state.error = '';
    notify();
  }

  function dismissError() {
    if (!state.error) return;
    state.error = '';
    notify();
  }

  return {
    state,
    sendMessage,
    applyProposal,
    dismissProposal,
    clearChat,
    dismissError,
  };
}
