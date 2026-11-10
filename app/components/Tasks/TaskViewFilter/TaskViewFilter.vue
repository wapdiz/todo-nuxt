<template>
  <div ref="rootRef" class="task-view-filter">
    <button
      ref="triggerRef"
      class="task-view-filter__trigger"
      :class="{ 'task-view-filter__trigger--active': modelValue !== 'all' }"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      @click="toggle"
      @keydown.esc.stop="close(true)"
    >
      <TaskIcon name="sliders" />
      <span>{{ buttonLabel }}</span>
    </button>

    <ul
      v-if="isOpen"
      class="task-view-filter__menu"
      role="menu"
      aria-label="Фильтр задач"
      @keydown.esc.stop="close(true)"
    >
      <li v-for="option in options" :key="option.value" role="none">
        <button
          class="task-view-filter__option"
          :class="{ 'task-view-filter__option--selected': modelValue === option.value }"
          type="button"
          role="menuitemradio"
          :aria-checked="modelValue === option.value"
          @click="select(option.value)"
        >
          <span>{{ option.label }}</span>
          <TaskIcon v-if="modelValue === option.value" class="task-view-filter__check" name="check" />
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import TaskIcon from '../TaskIcon/TaskIcon.vue';
import type { TaskViewFilter } from '~/utils/taskCalendar';

const options: ReadonlyArray<{ value: TaskViewFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'completed', label: 'Выполненные' },
];

const props = defineProps<{ modelValue: TaskViewFilter }>();
const emit = defineEmits<{ 'update:modelValue': [value: TaskViewFilter] }>();

const rootRef = ref<HTMLDivElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const isOpen = ref(false);

const buttonLabel = computed(() => {
  if (props.modelValue === 'all') return 'Вид';
  const current = options.find((item) => item.value === props.modelValue);
  return current ? `Вид: ${current.label}` : 'Вид';
});

function toggle() {
  isOpen.value = !isOpen.value;
}

function close(restoreFocus = false) {
  if (!isOpen.value) return;
  isOpen.value = false;
  if (restoreFocus) triggerRef.value?.focus();
}

function select(value: TaskViewFilter) {
  emit('update:modelValue', value);
  close(true);
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isOpen.value) return;
  const target = event.target;
  if (target instanceof Node && !rootRef.value?.contains(target)) {
    close(false);
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
});
</script>

<style lang="scss" scoped src="./style.scss"></style>
