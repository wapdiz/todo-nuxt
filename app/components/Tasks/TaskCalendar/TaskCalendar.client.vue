<template>
  <section class="task-calendar" :aria-labelledby="titleId">
    <header class="task-calendar__header">
      <button class="task-calendar__arrow" type="button" aria-label="Предыдущий месяц" @click="moveMonth(-1)">
        <TaskIcon name="chevron-left" />
      </button>
      <h2 :id="titleId" class="task-calendar__title" aria-live="polite">{{ monthLabel }}</h2>
      <button class="task-calendar__arrow" type="button" aria-label="Следующий месяц" @click="moveMonth(1)">
        <TaskIcon name="chevron-right" />
      </button>
    </header>

    <DatePicker
      ref="picker"
      v-model.string="selectedDate"
      class="task-calendar__picker"
      mode="date"
      locale="ru"
      :first-day-of-week="2"
      :masks="{ modelValue: 'YYYY-MM-DD', weekdays: 'WW' }"
      :initial-page="visiblePage"
      :trim-weeks="false"
      transition="none"
      is-required
      expanded
      borderless
      transparent
      @did-move="updateVisiblePage"
      @dayclick="onDayClick"
      @daykeydown="onDayKeydown"
    >
      <template #day-content="{ day, dayProps, dayEvents }">
        <button
          v-bind="dayProps"
          class="task-calendar__day"
          :class="{
            'task-calendar__day--selected': day.id === modelValue,
            'task-calendar__day--today': day.id === today,
            'task-calendar__day--outside': !day.inMonth,
          }"
          type="button"
          :data-date="day.id"
          :aria-label="`${day.ariaLabel}${taskDateSet.has(day.id) ? ', есть задачи' : ''}`"
          :aria-current="day.id === today ? 'date' : undefined"
          :aria-pressed="day.id === modelValue"
          v-on="dayEvents"
        >
          <span>{{ day.label }}</span>
          <span v-if="taskDateSet.has(day.id)" class="task-calendar__dot" aria-hidden="true"></span>
        </button>
      </template>
    </DatePicker>

    <button class="task-calendar__today" type="button" @click="selectToday">Сегодня</button>
  </section>
</template>

<script setup lang="ts">
import { DatePicker } from 'v-calendar';
import 'v-calendar/style.css';
import TaskIcon from '../TaskIcon/TaskIcon.vue';
import { getLocalDate, isTaskDate, parseTaskDate } from '~/utils/taskDate';

interface CalendarPage {
  year: number;
  month: number;
}

interface CalendarApi {
  move: (date: Date | CalendarPage, options?: { transition: 'none' }) => Promise<unknown>;
  moveBy: (amount: number, options?: { transition: 'none' }) => Promise<unknown>;
}

const props = defineProps<{ modelValue: string; today: string; taskDates: string[] }>();
const emit = defineEmits<{ 'update:modelValue': [date: string]; select: [] }>();
const titleId = useId();
const picker = ref<CalendarApi | null>(null);
const initialDate = parseTaskDate(props.modelValue) ?? new Date();
const visiblePage = ref<CalendarPage>({ year: initialDate.getFullYear(), month: initialDate.getMonth() + 1 });
const taskDateSet = computed(() => new Set(props.taskDates));

const monthLabel = computed(() => {
  const date = new Date(0);
  date.setFullYear(visiblePage.value.year, visiblePage.value.month - 1, 1);
  const label = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(/\s*г\.$/, '');
  return label.charAt(0).toLocaleUpperCase('ru-RU') + label.slice(1);
});

const selectedDate = computed({
  get: () => props.modelValue,
  set: (value: string) => {
    if (isTaskDate(value)) emit('update:modelValue', value);
  },
});

function updateVisiblePage(pages: unknown) {
  if (!Array.isArray(pages)) return;
  const first = pages[0];
  if (first && typeof first.year === 'number' && typeof first.month === 'number') {
    visiblePage.value = { year: first.year, month: first.month };
  }
}

async function moveMonth(amount: number) {
  await picker.value?.moveBy(amount, { transition: 'none' });
}

async function finishSelection(date: string) {
  const parsed = parseTaskDate(date);
  if (!parsed) return;
  await nextTick();
  await picker.value?.move(parsed, { transition: 'none' });
  await nextTick();
  emit('select');
}

function onDayClick(day: { id: string }) {
  void finishSelection(day.id);
}

function onDayKeydown(day: { id: string }, event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') void finishSelection(day.id);
}

async function selectToday() {
  const date = getLocalDate();
  emit('update:modelValue', date);
  await finishSelection(date);
}

watch(
  () => props.modelValue,
  async (value) => {
    const date = parseTaskDate(value);
    if (date) await picker.value?.move(date, { transition: 'none' });
  },
);
</script>

<style lang="scss" scoped src="./style.scss"></style>
