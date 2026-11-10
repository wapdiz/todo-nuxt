<template>
  <div class="task-sidebar">
    <div class="task-sidebar__brand">
      <span class="task-sidebar__mark"><TaskIcon name="check" /></span>
      <span>Список задач</span>
    </div>

    <section class="task-sidebar__calendar" aria-labelledby="calendar-preview-title" :aria-busy="!calendarDate">
      <div class="task-sidebar__calendar-header">
        <button class="task-sidebar__arrow" type="button" aria-label="Предыдущий месяц" disabled>
          <TaskIcon name="chevron-left" />
        </button>
        <h2 id="calendar-preview-title" class="task-sidebar__month">
          {{ monthLabel }} <span v-if="calendarDate">{{ calendarDate.getFullYear() }}</span>
        </h2>
        <button class="task-sidebar__arrow" type="button" aria-label="Следующий месяц" disabled>
          <TaskIcon name="chevron-right" />
        </button>
      </div>

      <table class="task-sidebar__calendar-grid" :aria-label="calendarLabel">
        <thead>
          <tr>
            <th v-for="weekday in weekdays" :key="weekday.short" scope="col">
              <abbr :title="weekday.full">{{ weekday.short }}</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(week, weekIndex) in weeks" :key="weekIndex">
            <td v-for="day in week" :key="day.key">
              <span
                class="task-sidebar__day"
                :class="{
                  'task-sidebar__day--muted': day.otherMonth,
                  'task-sidebar__day--selected': day.selected,
                }"
                :aria-current="day.selected ? 'date' : undefined"
                :aria-label="day.date"
              >
                {{ day.label }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

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
import TaskIcon from '../TaskIcon/TaskIcon.vue';
import { getLocalDate, parseTaskDate } from '~/utils/taskDate';

const props = defineProps<{ taskCount: number | null; date: string }>();
const calendarDate = computed(() => parseTaskDate(props.date));
const monthLabel = computed(() => {
  if (!calendarDate.value) return 'Календарь';
  const label = calendarDate.value.toLocaleDateString('ru-RU', { month: 'long' });
  return label.charAt(0).toLocaleUpperCase('ru-RU') + label.slice(1);
});
const calendarLabel = computed(() =>
  calendarDate.value
    ? `Календарь: ${calendarDate.value.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`
    : 'Календарь',
);

const weekdays = [
  { short: 'Пн', full: 'Понедельник' },
  { short: 'Вт', full: 'Вторник' },
  { short: 'Ср', full: 'Среда' },
  { short: 'Чт', full: 'Четверг' },
  { short: 'Пт', full: 'Пятница' },
  { short: 'Сб', full: 'Суббота' },
  { short: 'Вс', full: 'Воскресенье' },
];

const days = computed(() => {
  const selected = calendarDate.value;
  const first = selected ? new Date(selected) : null;
  first?.setDate(1);
  const offset = first ? (first.getDay() + 6) % 7 : 0;

  return Array.from({ length: 42 }, (_, index) => {
    if (!first || !selected) {
      return { key: `placeholder-${index}`, label: '', otherMonth: false, selected: false, date: undefined };
    }

    const date = new Date(first);
    date.setDate(1 - offset + index);
    const key = getLocalDate(date);

    return {
      key,
      label: date.getDate(),
      otherMonth: date.getMonth() !== selected.getMonth(),
      selected: key === props.date,
      date: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
  });
});

const weeks = computed(() => Array.from({ length: 6 }, (_, index) => days.value.slice(index * 7, index * 7 + 7)));
</script>

<style lang="scss" scoped src="./style.scss"></style>
