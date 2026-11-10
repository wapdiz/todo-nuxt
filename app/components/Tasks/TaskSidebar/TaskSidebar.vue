<template>
  <div class="task-sidebar">
    <div class="task-sidebar__brand">
      <span class="task-sidebar__mark"><TaskIcon name="check" /></span>
      <span>Список задач</span>
      <button
        v-if="showClose"
        class="task-sidebar__close"
        type="button"
        aria-label="Закрыть календарь"
        @click="emit('close')"
      >
        <TaskIcon name="close" />
      </button>
    </div>

    <div class="task-sidebar__calendar">
      <ClientOnly>
        <TasksTaskCalendar
          v-if="date && today"
          :model-value="date"
          :today="today"
          :task-dates="taskDates"
          @update:model-value="emit('selectDate', $event)"
          @select="emit('select')"
        />
        <template #fallback>
          <div class="task-sidebar__calendar-fallback" role="status">Загружаем календарь…</div>
        </template>
      </ClientOnly>
    </div>

    <section class="task-sidebar__overview" aria-labelledby="task-overview-title">
      <h2 id="task-overview-title" class="task-sidebar__section-title">Обзор</h2>
      <div class="task-sidebar__current-list">
        <TaskIcon name="list" />
        <span>Мои задачи</span>
        <span
          class="task-sidebar__count"
          :aria-label="taskCount === null ? 'Задачи ещё не загружены' : `Всего задач: ${taskCount}`"
        >
          {{ taskCount ?? '—' }}
        </span>
      </div>
    </section>

    <div class="task-sidebar__local">
      <TaskIcon name="calendar" />
      <span>На этом устройстве</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TasksTaskCalendar } from '#components';
import TaskIcon from '../TaskIcon/TaskIcon.vue';

withDefaults(
  defineProps<{ taskCount: number | null; date: string; today: string; taskDates: string[]; showClose?: boolean }>(),
  { showClose: false },
);
const emit = defineEmits<{ selectDate: [date: string]; select: []; close: [] }>();
</script>

<style lang="scss" scoped src="./style.scss"></style>
