<template>
  <div class="task-sidebar">
    <div class="task-sidebar__brand">
      <span class="task-sidebar__mark"><TaskIcon name="check" /></span>
      <span>Список задач</span>
    </div>

    <section class="task-sidebar__calendar" aria-labelledby="calendar-preview-title">
      <div class="task-sidebar__calendar-header">
        <button class="task-sidebar__arrow" type="button" aria-label="Предыдущий месяц" disabled>
          <TaskIcon name="chevron-left" />
        </button>
        <h2 id="calendar-preview-title" class="task-sidebar__month">Ноябрь <span>2026</span></h2>
        <button class="task-sidebar__arrow" type="button" aria-label="Следующий месяц" disabled>
          <TaskIcon name="chevron-right" />
        </button>
      </div>

      <table class="task-sidebar__calendar-grid" aria-label="Календарь на ноябрь 2026 года">
        <thead>
          <tr>
            <th v-for="weekday in weekdays" :key="weekday.short" scope="col">
              <abbr :title="weekday.full">{{ weekday.short }}</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(week, weekIndex) in weeks" :key="weekIndex">
            <td v-for="day in week" :key="day.date">
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
        <span class="task-sidebar__count" aria-label="5 задач">5</span>
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

const weekdays = [
  { short: 'Пн', full: 'Понедельник' },
  { short: 'Вт', full: 'Вторник' },
  { short: 'Ср', full: 'Среда' },
  { short: 'Чт', full: 'Четверг' },
  { short: 'Пт', full: 'Пятница' },
  { short: 'Сб', full: 'Суббота' },
  { short: 'Вс', full: 'Воскресенье' },
];

const days = Array.from({ length: 42 }, (_, index) => {
  const day = index - 5;
  const otherMonth = day < 1 || day > 30;
  const label = day < 1 ? day + 31 : day > 30 ? day - 30 : day;
  const month = day < 1 ? 'октября' : day > 30 ? 'декабря' : 'ноября';

  return { label, otherMonth, selected: day === 10, date: `${label} ${month} 2026 года` };
});

const weeks = Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7));
</script>

<style lang="scss" scoped src="./style.scss"></style>
