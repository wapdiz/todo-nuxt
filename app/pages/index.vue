<template>
  <div class="todo-page">
    <div class="todo-shell">
      <div v-if="drawerA11y.isAnyOpen" class="todo-shell__backdrop" aria-hidden="true" @click="closeDrawers"></div>

      <aside
        id="task-calendar-panel"
        ref="calendarPanelRef"
        class="todo-shell__sidebar"
        :class="{ 'todo-shell__sidebar--open': isCalendarOpen }"
        aria-label="Обзор задач и календарь"
        :role="drawerA11y.isCalendarModal ? 'dialog' : undefined"
        :aria-modal="drawerA11y.isCalendarModal ? 'true' : undefined"
        :tabindex="drawerA11y.isCalendarModal ? -1 : undefined"
        :inert="drawerA11y.calendarInert"
      >
        <div class="todo-shell__sidebar-sticky">
          <TaskSidebar
            :task-count="taskStore.isReady ? taskStore.tasks.length : null"
            :date="activeDate"
            :today="todayDate"
            :task-dates="taskStore.isReady ? taskDates : []"
            :show-close="isCalendarOpen"
            @select-date="selectDate"
            @select="closeCalendar"
            @close="closeCalendar"
          />
        </div>
      </aside>

      <main class="todo-main" :inert="drawerA11y.mainInert">
        <div class="todo-mobile-bar">
          <button
            ref="calendarButton"
            class="todo-mobile-bar__btn todo-mobile-bar__calendar"
            type="button"
            aria-controls="task-calendar-panel"
            :aria-expanded="isCalendarOpen"
            @click="toggleCalendar"
          >
            <TaskIcon :name="isCalendarOpen ? 'close' : 'calendar'" />
            <span>Календарь</span>
          </button>
          <button
            ref="aiButton"
            class="todo-mobile-bar__btn todo-mobile-bar__ai"
            type="button"
            aria-controls="task-ai-panel"
            :aria-expanded="isAiOpen"
            @click="toggleAi"
          >
            <TaskIcon :name="isAiOpen ? 'close' : 'sparkles'" />
            <span>ИИ-чат</span>
          </button>
        </div>

        <header class="todo-main__hero">
          <div class="todo-main__aura" aria-hidden="true"></div>
          <div class="todo-heading">
            <div>
              <h1 class="todo-heading__title">{{ greetingText }}</h1>
              <p class="todo-heading__date" aria-live="polite" aria-atomic="true">{{ dateLabel }}</p>
            </div>
            <div class="todo-heading__actions">
              <TaskViewFilter v-model="viewFilter" />
              <button class="todo-heading__add" type="button" :disabled="!taskStore.isReady" @click="taskForm?.focus()">
                <TaskIcon name="plus" />
                <span>Новая задача</span>
              </button>
            </div>
          </div>
        </header>

        <div class="todo-main__content">
          <TaskForm
            ref="taskForm"
            :error="formError"
            :note="storageNote"
            :disabled="!activeDate || !taskStore.isReady"
            @add="addTask"
          />
          <TaskStorageNotice
            v-if="taskStore.storageIssue"
            ref="storageNotice"
            class="todo-main__storage"
            :issue="taskStore.storageIssue"
            :loaded="taskStore.isReady"
            @retry="retryLoad"
            @reset="resetStorage"
          />
          <TaskList
            v-if="taskStore.isReady"
            ref="taskList"
            class="todo-main__list"
            :items="filteredTasks"
            :heading="listHeading"
            :total-count="dayTasks.length"
            :completed-count="dayCompletedCount"
            :reorder-disabled="viewFilter !== 'all'"
            :empty-text="emptyListText"
            @set-completed="handleSetCompleted"
            @remove="removeTask"
            @reorder="reorderTasks"
          />
          <p v-else-if="!taskStore.storageIssue" class="todo-main__loading" role="status">Загружаем задачи…</p>
        </div>

        <footer class="todo-main__footer">
          <span class="todo-main__status"><span></span>Личный список</span>
          <span>Задачи сохраняются в этом браузере.</span>
        </footer>
      </main>

      <aside
        id="task-ai-panel"
        ref="aiPanelRef"
        class="todo-shell__ai"
        :class="{ 'todo-shell__ai--open': isAiOpen }"
        aria-label="ИИ-ассистент"
        :role="drawerA11y.isAiModal ? 'dialog' : undefined"
        :aria-modal="drawerA11y.isAiModal ? 'true' : undefined"
        :tabindex="drawerA11y.isAiModal ? -1 : undefined"
        :inert="drawerA11y.aiInert"
      >
        <div class="todo-shell__ai-sticky">
          <TaskAiChat
            ref="aiChatRef"
            :messages="aiChat.state.messages"
            :is-pending="aiChat.state.isPending"
            :error="aiChat.state.error"
            :active-date="activeDate"
            :today-date="todayDate"
            :day-tasks="dayTasks"
            :storage-ready="taskStore.isReady"
            :show-close="isAiOpen"
            @send="handleAiSend"
            @apply-proposal="handleApplyProposal"
            @dismiss-proposal="handleDismissProposal"
            @clear="aiChat.clearChat"
            @dismiss-error="aiChat.dismissError"
            @close="closeAi"
          />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { AiChatMode, AiChatResponse } from '#shared/types/aiChat';
import { getLocalDate, isTaskDate, parseTaskDate } from '#shared/utils/taskDate';
import TaskAiChat from '~/components/Ai/TaskAiChat/TaskAiChat.vue';
import TaskForm from '~/components/Tasks/TaskForm/TaskForm.vue';
import TaskIcon from '~/components/Tasks/TaskIcon/TaskIcon.vue';
import TaskList from '~/components/Tasks/TaskList/TaskList.vue';
import TaskSidebar from '~/components/Tasks/TaskSidebar/TaskSidebar.vue';
import TaskStorageNotice from '~/components/Tasks/TaskStorageNotice/TaskStorageNotice.vue';
import TaskViewFilter from '~/components/Tasks/TaskViewFilter/TaskViewFilter.vue';
import { useTaskStore } from '~/stores/taskStore';
import { TASK_TITLE_MAX_LENGTH } from '~/types/task';
import { createAiChatService } from '~/utils/aiChatState';
import {
  AI_DRAWER_MEDIA_QUERY,
  MOBILE_DRAWER_MEDIA_QUERY,
  focusFirstFocusable,
  getDrawerAccessibilityState,
  handleModalTabKey,
  type ActiveDrawerKind,
} from '~/utils/drawerFocus';
import {
  filterTasksByView,
  getNextVisibleTaskId,
  getTaskDates,
  getTasksForDate,
  type TaskViewFilter as TaskViewFilterMode,
} from '~/utils/taskCalendar';

const taskStore = useTaskStore();
const activeDate = ref('');
const todayDate = ref('');
const greetingText = ref('Хорошего дня!');
const formError = ref('');
const viewFilter = ref<TaskViewFilterMode>('all');
const isCalendarOpen = ref(false);
const isAiOpen = ref(false);

const activeDrawer = computed<ActiveDrawerKind>(() => {
  if (isAiOpen.value) return 'ai';
  if (isCalendarOpen.value) return 'calendar';
  return null;
});
const drawerA11y = computed(() => getDrawerAccessibilityState(activeDrawer.value));

const calendarPanelRef = ref<HTMLElement | null>(null);
const aiPanelRef = ref<HTMLElement | null>(null);
const calendarButton = ref<HTMLButtonElement | null>(null);
const aiButton = ref<HTMLButtonElement | null>(null);
const taskForm = ref<InstanceType<typeof TaskForm> | null>(null);
const taskList = ref<InstanceType<typeof TaskList> | null>(null);
const storageNotice = ref<InstanceType<typeof TaskStorageNotice> | null>(null);
const aiChatRef = ref<InstanceType<typeof TaskAiChat> | null>(null);

const dayTasks = computed(() => getTasksForDate(taskStore.tasks, activeDate.value));
const filteredTasks = computed(() => filterTasksByView(dayTasks.value, viewFilter.value));
const dayCompletedCount = computed(() => dayTasks.value.filter((task) => task.completed).length);
const taskDates = computed(() => getTaskDates(taskStore.tasks));
const listHeading = computed(() => (activeDate.value === todayDate.value ? 'Мои задачи' : 'На выбранный день'));

const emptyListText = computed(() => {
  if (dayTasks.value.length > 0 && viewFilter.value === 'active') return 'Нет активных задач на этот день.';
  if (viewFilter.value === 'completed') return 'Выполненных задач пока нет.';
  return 'На этот день задач нет.';
});

const storageNote = computed(() => {
  if (taskStore.storageIssue) {
    return taskStore.isReady
      ? 'Последнее изменение не сохранено. Повторите действие.'
      : 'Изменения недоступны, пока сохранённый список не загружен.';
  }
  return taskStore.isReady ? 'Задачи сохраняются в этом браузере.' : 'Загружаем сохранённые задачи…';
});

const dateLabel = computed(() => {
  const date = parseTaskDate(activeDate.value);
  if (!date) return 'Сегодня';

  const today = parseTaskDate(todayDate.value);
  const label = date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(today && today.getFullYear() !== date.getFullYear() ? { year: 'numeric' } : {}),
  });
  return label.charAt(0).toLocaleUpperCase('ru-RU') + label.slice(1);
});

const aiChat = createAiChatService({
  createState: (initial) => reactive(initial),
  sendRequest: (payload, signal) =>
    $fetch<AiChatResponse>('/api/ai-chat', {
      method: 'POST',
      body: payload,
      signal,
    }),
  applyTasks: (items) => taskStore.addTasksBatch(items),
});

function updateGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) greetingText.value = 'Доброе утро!';
  else if (hour >= 12 && hour < 18) greetingText.value = 'Добрый день!';
  else if (hour >= 18 && hour < 23) greetingText.value = 'Добрый вечер!';
  else greetingText.value = 'Доброй ночи!';
}

let mobileDrawerMedia: MediaQueryList | null = null;
let aiDrawerMedia: MediaQueryList | null = null;

function handleDrawerDocumentKeydown(event: KeyboardEvent) {
  const currentDrawer = activeDrawer.value;
  if (!currentDrawer) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeDrawers();
    return;
  }

  if (event.key === 'Tab') {
    const container = currentDrawer === 'ai' ? aiPanelRef.value : calendarPanelRef.value;
    handleModalTabKey(container, event);
  }
}

function syncDrawerBreakpoints() {
  if (mobileDrawerMedia && !mobileDrawerMedia.matches && isCalendarOpen.value) {
    isCalendarOpen.value = false;
  }
  if (aiDrawerMedia && !aiDrawerMedia.matches && isAiOpen.value) {
    isAiOpen.value = false;
  }
}

watch(activeDrawer, (drawer, previousDrawer) => {
  if (typeof document === 'undefined') return;
  if (drawer && !previousDrawer) {
    document.addEventListener('keydown', handleDrawerDocumentKeydown);
  } else if (!drawer && previousDrawer) {
    document.removeEventListener('keydown', handleDrawerDocumentKeydown);
  }
});

onMounted(() => {
  refreshToday();
  activeDate.value = todayDate.value;
  updateGreeting();
  taskStore.initialize();
  window.addEventListener('focus', refreshToday);
  mobileDrawerMedia = window.matchMedia(MOBILE_DRAWER_MEDIA_QUERY);
  aiDrawerMedia = window.matchMedia(AI_DRAWER_MEDIA_QUERY);
  mobileDrawerMedia.addEventListener('change', syncDrawerBreakpoints);
  aiDrawerMedia.addEventListener('change', syncDrawerBreakpoints);
});

onBeforeUnmount(() => {
  window.removeEventListener('focus', refreshToday);
  document.removeEventListener('keydown', handleDrawerDocumentKeydown);
  mobileDrawerMedia?.removeEventListener('change', syncDrawerBreakpoints);
  aiDrawerMedia?.removeEventListener('change', syncDrawerBreakpoints);
});

function refreshToday() {
  todayDate.value = getLocalDate();
  updateGreeting();
}

function selectDate(date: string) {
  if (!isTaskDate(date)) return;
  refreshToday();
  activeDate.value = date;
  formError.value = '';
}

watch(
  () => taskStore.storageIssue,
  async (issue) => {
    if (issue !== 'conflict') return;
    await nextTick();
    storageNotice.value?.focusRetry();
  },
);

async function retryLoad() {
  if (!taskStore.initialize()) return;
  formError.value = '';
  await nextTick();
  taskForm.value?.focus();
}

async function resetStorage() {
  const confirmed = window.confirm(
    'Начать новый список? Сохранённые задачи на этом устройстве будут удалены. Отменить это действие нельзя.',
  );
  if (!confirmed || !taskStore.resetStorage()) return;

  formError.value = '';
  await nextTick();
  taskForm.value?.reset();
}

function addTask(title: string) {
  formError.value = '';
  const task = taskStore.addTask(title, activeDate.value);

  if (!task) {
    if (!taskStore.storageIssue) {
      formError.value = `Название должно содержать от 1 до ${TASK_TITLE_MAX_LENGTH} символов.`;
    }
    return;
  }

  taskForm.value?.reset();
}

async function handleSetCompleted(id: string, completed: boolean) {
  const wasFocused = taskList.value?.isTaskFocused(id) ?? false;
  const willDisappear =
    (viewFilter.value === 'active' && completed) || (viewFilter.value === 'completed' && !completed);
  const nextVisibleId = willDisappear ? getNextVisibleTaskId(filteredTasks.value, id) : null;

  if (!taskStore.setCompleted(id, completed)) return;

  if (willDisappear) {
    taskList.value?.setAnnouncement(
      completed ? 'Задача выполнена и скрыта фильтром.' : 'Отметка снята, задача скрыта фильтром.',
    );
    if (wasFocused) {
      if (nextVisibleId && (await taskList.value?.focusTask(nextVisibleId))) return;
      taskForm.value?.focus();
    }
  }
}

async function removeTask(id: string) {
  if (!dayTasks.value.some((task) => task.id === id)) return;
  const focusTarget = getNextVisibleTaskId(filteredTasks.value, id);
  if (!taskStore.removeTask(id)) return;

  if (focusTarget && (await taskList.value?.focusTask(focusTarget))) return;
  taskForm.value?.focus();
}

function reorderTasks(orderedIds: string[]) {
  if (!activeDate.value || viewFilter.value !== 'all') return;
  taskStore.reorderTasks(activeDate.value, orderedIds);
}

async function handleAiSend({ text, mode }: { text: string; mode: AiChatMode }) {
  const ok = await aiChat.sendMessage({
    text,
    mode,
    activeDate: activeDate.value,
    todayDate: todayDate.value,
    dayTasks: dayTasks.value,
  });

  if (!ok && !aiChat.state.isPending && aiChat.state.error) {
    aiChatRef.value?.restoreDraft(text, mode);
  }
}

function handleApplyProposal(messageId: string, proposalId: string, selectedIndices: number[]) {
  aiChat.applyProposal(messageId, proposalId, selectedIndices);
}

function handleDismissProposal(messageId: string, proposalId: string) {
  aiChat.dismissProposal(messageId, proposalId);
}

async function closeCalendar() {
  if (!isCalendarOpen.value) return;
  isCalendarOpen.value = false;
  await nextTick();
  calendarButton.value?.focus();
}

async function closeAi() {
  if (!isAiOpen.value) return;
  isAiOpen.value = false;
  await nextTick();
  aiButton.value?.focus();
}

function closeDrawers() {
  if (isCalendarOpen.value) void closeCalendar();
  if (isAiOpen.value) void closeAi();
}

async function toggleCalendar() {
  if (isCalendarOpen.value) {
    await closeCalendar();
  } else {
    isAiOpen.value = false;
    isCalendarOpen.value = true;
    await nextTick();
    focusFirstFocusable(calendarPanelRef.value);
  }
}

async function toggleAi() {
  if (isAiOpen.value) {
    await closeAi();
  } else {
    isCalendarOpen.value = false;
    isAiOpen.value = true;
    await nextTick();
    aiChatRef.value?.focusInput();
  }
}

useSeoMeta({
  title: 'Список задач',
  description: 'Личный список задач с календарём и ИИ-помощником.',
});
</script>

<style lang="scss" scoped src="./index.scss"></style>
