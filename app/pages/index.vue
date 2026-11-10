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
        <TaskSidebar :task-count="taskStore.tasks.length" :date="activeDate" />
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
              <p class="todo-heading__date">{{ dateLabel }}</p>
            </div>
            <div class="todo-heading__actions">
              <button
                class="todo-heading__add"
                type="button"
                aria-label="Перейти к полю новой задачи"
                @click="taskForm?.focus()"
              >
                <TaskIcon name="plus" />
              </button>
            </div>
          </div>

          <TaskForm ref="taskForm" :error="formError" :disabled="!activeDate" @add="addTask" />
          <TaskList
            ref="taskList"
            class="todo-main__list"
            :items="taskStore.tasks"
            @set-completed="taskStore.setCompleted"
            @remove="removeTask"
          />
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
import { useTaskStore } from '~/stores/taskStore';
import { TASK_TITLE_MAX_LENGTH } from '~/types/task';
import { getLocalDate, parseTaskDate } from '~/utils/taskDate';

const taskStore = useTaskStore();
const activeDate = ref('');
const formError = ref('');
const isCalendarOpen = ref(false);
const calendarButton = ref<HTMLButtonElement | null>(null);
const taskForm = ref<InstanceType<typeof TaskForm> | null>(null);
const taskList = ref<InstanceType<typeof TaskList> | null>(null);

const dateLabel = computed(() => {
  const date = parseTaskDate(activeDate.value);
  if (!date) return 'Сегодня';

  const label = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toLocaleUpperCase('ru-RU') + label.slice(1);
});

onMounted(() => {
  activeDate.value = getLocalDate();
});

function addTask(title: string) {
  formError.value = '';
  const task = taskStore.addTask(title, activeDate.value);

  if (!task) {
    formError.value = `Название должно содержать от 1 до ${TASK_TITLE_MAX_LENGTH} символов.`;
    return;
  }

  taskForm.value?.reset();
}

async function removeTask(id: string) {
  const index = taskStore.tasks.findIndex((task) => task.id === id);
  if (index === -1) return;

  const focusTarget = taskStore.tasks[index + 1] ?? taskStore.tasks[index - 1];
  taskStore.removeTask(id);

  if (focusTarget && (await taskList.value?.focusTask(focusTarget.id))) return;
  taskForm.value?.focus();
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
