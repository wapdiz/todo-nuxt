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
        <TaskSidebar />
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
              <p class="todo-heading__date">Вторник, 10 ноября</p>
            </div>
            <div class="todo-heading__actions">
              <span class="todo-heading__preview">Предпросмотр</span>
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

          <TaskForm ref="taskForm" />
          <TaskList class="todo-main__list" :items="previewTasks" />
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

const isCalendarOpen = ref(false);
const calendarButton = ref<HTMLButtonElement | null>(null);
const taskForm = ref<InstanceType<typeof TaskForm> | null>(null);

function closeCalendar() {
  if (!isCalendarOpen.value) return;
  isCalendarOpen.value = false;
  calendarButton.value?.focus();
}

function toggleCalendar() {
  if (isCalendarOpen.value) closeCalendar();
  else isCalendarOpen.value = true;
}

const previewTasks = [
  { id: 'preview-1', title: 'Продумать главную страницу проекта', completed: false },
  { id: 'preview-2', title: 'Собрать референсы для нового интерфейса', completed: false },
  { id: 'preview-3', title: 'Запланировать задачи на неделю', completed: false },
  { id: 'preview-4', title: 'Разобрать заметки после встречи', completed: true },
  { id: 'preview-5', title: 'Подготовить рабочее пространство', completed: true },
];

useSeoMeta({
  title: 'Список задач',
  description: 'Личный список задач с календарём: всё важное в одном месте.',
});
</script>

<style lang="scss" scoped src="./index.scss"></style>
