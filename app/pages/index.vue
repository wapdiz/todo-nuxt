<template>
  <div class="todo-page" @keydown.esc="closeCalendar">
    <div class="todo-shell">
      <button
        v-if="isCalendarOpen"
        class="todo-shell__backdrop"
        type="button"
        aria-label="Закрыть календарь"
        @click="closeCalendar"
      ></button>
      <aside
        id="task-calendar-panel"
        class="todo-shell__sidebar"
        :class="{ 'todo-shell__sidebar--open': isCalendarOpen }"
        aria-label="Обзор задач и календарь"
      >
        <TaskSidebar
          :task-count="taskStore.isReady ? taskStore.tasks.length : null"
          :date="activeDate"
          :today="todayDate"
          :task-dates="taskStore.isReady ? taskDates : []"
          @select-date="selectDate"
          @select="closeCalendar"
        />
      </aside>

      <main class="todo-main">
        <header class="todo-toolbar">
          <div class="todo-toolbar__greeting">
            <span class="todo-toolbar__sun"><TaskIcon name="sun" /></span>
            <div>
              <p class="todo-toolbar__hello">Хорошего дня!</p>
              <p class="todo-toolbar__caption">Всё важное — в одном месте.</p>
            </div>
          </div>
          <button
            ref="calendarButton"
            class="todo-toolbar__calendar"
            type="button"
            aria-controls="task-calendar-panel"
            :aria-expanded="isCalendarOpen"
            @click="toggleCalendar"
          >
            <TaskIcon :name="isCalendarOpen ? 'close' : 'calendar'" />
            <span>Календарь</span>
          </button>
        </header>

        <div class="todo-main__content">
          <div class="todo-heading">
            <div>
              <h1 class="todo-heading__title">Мои задачи</h1>
              <p class="todo-heading__date" aria-live="polite" aria-atomic="true">{{ dateLabel }}</p>
            </div>
            <div class="todo-heading__actions">
              <button
                class="todo-heading__add"
                type="button"
                aria-label="Перейти к полю новой задачи"
                :disabled="!taskStore.isReady"
                @click="taskForm?.focus()"
              >
                <TaskIcon name="plus" />
              </button>
            </div>
          </div>

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
            :items="visibleTasks"
            :heading="listHeading"
            @set-completed="taskStore.setCompleted"
            @remove="removeTask"
            @reorder="reorderTasks"
          />
          <p v-else-if="!taskStore.storageIssue" class="todo-main__loading" role="status">Загружаем задачи…</p>
        </div>

        <footer class="todo-main__footer">
          <span class="todo-main__status"><span></span>Личный список</span>
          <span>Один день — один шаг вперёд.</span>
        </footer>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import TaskForm from '~/components/Tasks/TaskForm/TaskForm.vue';
import TaskIcon from '~/components/Tasks/TaskIcon/TaskIcon.vue';
import TaskList from '~/components/Tasks/TaskList/TaskList.vue';
import TaskSidebar from '~/components/Tasks/TaskSidebar/TaskSidebar.vue';
import TaskStorageNotice from '~/components/Tasks/TaskStorageNotice/TaskStorageNotice.vue';
import { useTaskStore } from '~/stores/taskStore';
import { TASK_TITLE_MAX_LENGTH } from '~/types/task';
import { getLocalDate, isTaskDate, parseTaskDate } from '~/utils/taskDate';
import { getNextVisibleTaskId, getTaskDates, getTasksForDate } from '~/utils/taskCalendar';

const taskStore = useTaskStore();
const activeDate = ref('');
const todayDate = ref('');
const formError = ref('');
const isCalendarOpen = ref(false);
const calendarButton = ref<HTMLButtonElement | null>(null);
const taskForm = ref<InstanceType<typeof TaskForm> | null>(null);
const taskList = ref<InstanceType<typeof TaskList> | null>(null);
const storageNotice = ref<InstanceType<typeof TaskStorageNotice> | null>(null);
const visibleTasks = computed(() => getTasksForDate(taskStore.tasks, activeDate.value));
const taskDates = computed(() => getTaskDates(taskStore.tasks));
const listHeading = computed(() => (activeDate.value === todayDate.value ? 'На сегодня' : 'На выбранный день'));

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

onMounted(() => {
  refreshToday();
  activeDate.value = todayDate.value;
  taskStore.initialize();
  window.addEventListener('focus', refreshToday);
});

onBeforeUnmount(() => {
  window.removeEventListener('focus', refreshToday);
});

function refreshToday() {
  todayDate.value = getLocalDate();
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

async function removeTask(id: string) {
  if (!visibleTasks.value.some((task) => task.id === id)) return;
  const focusTarget = getNextVisibleTaskId(visibleTasks.value, id);
  if (!taskStore.removeTask(id)) return;

  if (focusTarget && (await taskList.value?.focusTask(focusTarget))) return;
  taskForm.value?.focus();
}

function reorderTasks(orderedIds: string[]) {
  if (!activeDate.value) return;
  taskStore.reorderTasks(activeDate.value, orderedIds);
}

function closeCalendar() {
  if (!isCalendarOpen.value) return;
  isCalendarOpen.value = false;
  calendarButton.value?.focus();
}

function toggleCalendar() {
  if (isCalendarOpen.value) closeCalendar();
  else isCalendarOpen.value = true;
}

useSeoMeta({
  title: 'Список задач',
  description: 'Личный список задач с календарём: всё важное в одном месте.',
});
</script>

<style lang="scss" scoped src="./index.scss"></style>
