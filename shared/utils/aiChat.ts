import type {
  AiChatHistoryItem,
  AiChatMode,
  AiChatRequest,
  AiChatResponse,
  AiProposalAddTasks,
  AiProposalSplitTask,
  AiProposedAction,
  AiProposedTaskItem,
  AiTaskContextItem,
} from '../types/aiChat';
import { isTaskDate } from './taskDate';

export const AI_MAX_REQUEST_BYTES = 65_536;
export const AI_BODY_READ_TIMEOUT_MS = 10_000;
export const AI_MAX_MESSAGE_LENGTH = 500;
export const AI_MAX_HISTORY_ITEMS = 6;
export const AI_MAX_HISTORY_TEXT_LENGTH = 500;
export const AI_MAX_CONTEXT_TASKS = 40;
export const AI_MAX_TASK_ID_LENGTH = 64;
export const AI_TASK_TITLE_MAX_LENGTH = 200;
export const AI_MAX_REPLY_LENGTH = 2000;
export const AI_MAX_PROPOSALS = 3;
export const AI_MAX_PROPOSAL_ITEMS = 10;
export const AI_MAX_PROPOSAL_SUMMARY_LENGTH = 240;

const VALID_MODES = new Set<AiChatMode>(['chat', 'create_tasks', 'split_task']);
let proposalSequence = 0;

function createAppProposalId(index: number): string {
  const seq = ++proposalSequence;
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `proposal-${seq}-${globalThis.crypto.randomUUID()}`;
  }
  return `proposal-${Date.now().toString(36)}-${seq}-${index + 1}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function truncateText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, maxLength).trim();
}

export function parseAiChatRequest(raw: unknown): AiChatRequest | null {
  if (!isRecord(raw)) return null;

  const mode = raw.mode;
  if (typeof mode !== 'string' || !VALID_MODES.has(mode as AiChatMode)) return null;

  const message = normalizeText(raw.message, AI_MAX_MESSAGE_LENGTH);
  if (!message) return null;

  if (typeof raw.activeDate !== 'string' || !isTaskDate(raw.activeDate)) return null;
  if (typeof raw.todayDate !== 'string' || !isTaskDate(raw.todayDate)) return null;

  if (!Array.isArray(raw.tasks) || raw.tasks.length > AI_MAX_CONTEXT_TASKS) return null;
  const tasks: AiTaskContextItem[] = [];
  for (const item of raw.tasks) {
    if (!isRecord(item)) return null;
    const id = normalizeText(item.id, AI_MAX_TASK_ID_LENGTH);
    const title = normalizeText(item.title, AI_TASK_TITLE_MAX_LENGTH);
    if (!id || !title) return null;
    if (typeof item.completed !== 'boolean') return null;
    if (typeof item.scheduledDate !== 'string' || item.scheduledDate !== raw.activeDate) return null;
    tasks.push({ id, title, completed: item.completed, scheduledDate: item.scheduledDate });
  }

  const rawHistory = raw.history === undefined ? [] : raw.history;
  if (!Array.isArray(rawHistory) || rawHistory.length > AI_MAX_HISTORY_ITEMS) return null;
  const history: AiChatHistoryItem[] = [];
  for (const entry of rawHistory) {
    if (!isRecord(entry)) return null;
    if (entry.role !== 'user' && entry.role !== 'assistant') return null;
    const text = normalizeText(entry.text, AI_MAX_HISTORY_TEXT_LENGTH);
    if (!text) return null;
    history.push({ role: entry.role, text });
  }

  return {
    message,
    mode: mode as AiChatMode,
    activeDate: raw.activeDate,
    todayDate: raw.todayDate,
    tasks,
    history,
  };
}

function stripJsonCodeFences(rawText: string): string {
  const trimmed = rawText.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced?.[1]?.trim() ?? trimmed;
}

function parseJsonObjectFromString(text: string): Record<string, unknown> | null {
  const stripped = stripJsonCodeFences(text);
  try {
    const parsed = JSON.parse(stripped);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function sanitizeProposedItems(rawItems: unknown, fallbackDate: string): AiProposedTaskItem[] {
  if (!Array.isArray(rawItems)) return [];
  const items: AiProposedTaskItem[] = [];

  for (const rawItem of rawItems) {
    if (items.length >= AI_MAX_PROPOSAL_ITEMS) break;

    if (typeof rawItem === 'string') {
      const title = truncateText(rawItem, AI_TASK_TITLE_MAX_LENGTH);
      if (title) items.push({ title, scheduledDate: fallbackDate });
      continue;
    }

    if (!isRecord(rawItem)) continue;
    const title = truncateText(rawItem.title, AI_TASK_TITLE_MAX_LENGTH);
    if (!title) continue;

    const scheduledDate =
      typeof rawItem.scheduledDate === 'string' && isTaskDate(rawItem.scheduledDate)
        ? rawItem.scheduledDate
        : fallbackDate;

    items.push({ title, scheduledDate });
  }

  return items;
}

function sanitizeProposal(raw: unknown, index: number, fallbackDate: string): AiProposedAction | null {
  if (!isRecord(raw)) return null;

  // Игнорируем ID от модели, чтобы дублирующиеся значения (например p-1) не путали карточки.
  const id = createAppProposalId(index);
  const summary = truncateText(raw.summary, AI_MAX_PROPOSAL_SUMMARY_LENGTH);

  if (raw.type === 'add_tasks') {
    const tasks = sanitizeProposedItems(raw.tasks, fallbackDate);
    if (tasks.length === 0) return null;

    const proposal: AiProposalAddTasks = {
      id,
      type: 'add_tasks',
      summary: summary || 'Предлагаю добавить задачи',
      tasks,
    };
    return proposal;
  }

  if (raw.type === 'split_task') {
    const sourceTitle = truncateText(raw.sourceTitle, AI_TASK_TITLE_MAX_LENGTH);
    if (!sourceTitle) return null;

    const scheduledDate =
      typeof raw.scheduledDate === 'string' && isTaskDate(raw.scheduledDate) ? raw.scheduledDate : fallbackDate;
    const steps = sanitizeProposedItems(raw.steps, scheduledDate);
    if (steps.length === 0) return null;

    const sourceTaskId = normalizeText(raw.sourceTaskId, AI_MAX_TASK_ID_LENGTH) ?? undefined;
    const proposal: AiProposalSplitTask = {
      id,
      type: 'split_task',
      summary: summary || `Шаги для задачи: ${sourceTitle}`,
      ...(sourceTaskId ? { sourceTaskId } : {}),
      sourceTitle,
      scheduledDate,
      steps,
    };
    return proposal;
  }

  return null;
}

export function parseAiChatResponse(raw: unknown, fallbackDate: string): AiChatResponse {
  const safeFallbackDate = isTaskDate(fallbackDate) ? fallbackDate : '1970-01-01';
  let candidate: Record<string, unknown> | null = null;

  if (typeof raw === 'string') {
    candidate = parseJsonObjectFromString(raw);
    if (!candidate) {
      return {
        reply: truncateText(raw, AI_MAX_REPLY_LENGTH) || 'Ассистент не смог сформировать ответ.',
        proposals: [],
      };
    }
  } else if (isRecord(raw)) {
    if (typeof raw.output === 'string' && !('reply' in raw) && !('proposals' in raw)) {
      return parseAiChatResponse(raw.output, safeFallbackDate);
    }
    if (isRecord(raw.output) && !('reply' in raw)) {
      candidate = raw.output;
    } else {
      candidate = raw;
    }
  }

  if (!candidate) {
    return { reply: 'Ассистент не смог сформировать ответ.', proposals: [] };
  }

  const proposals: AiProposedAction[] = [];
  if (Array.isArray(candidate.proposals)) {
    for (const [index, rawProposal] of candidate.proposals.entries()) {
      if (proposals.length >= AI_MAX_PROPOSALS) break;
      const sanitized = sanitizeProposal(rawProposal, index, safeFallbackDate);
      if (sanitized) proposals.push(sanitized);
    }
  }

  const rawReply = truncateText(candidate.reply, AI_MAX_REPLY_LENGTH);
  const reply =
    rawReply ||
    (proposals.length > 0 ? 'Подготовил предложения для вашего списка.' : 'Ассистент не смог сформировать ответ.');

  return { reply, proposals };
}
