<template>
  <component
    :is="floating ? 'div' : 'li'"
    ref="rootRef"
    class="task-item"
    :class="{
      'task-item--completed': item.completed,
      'task-item--draggable': draggable && !floating,
      'task-item--placeholder': dragging,
      'task-item--floating': floating,
    }"
    :inert="floating || undefined"
    @pointerdown="handleRowPointerDown"
  >
    <button
      ref="gripRef"
      class="task-item__grip"
      type="button"
      :tabindex="floating ? -1 : undefined"
      :disabled="!floating && !draggable"
      :aria-label="floating ? undefined : `Переместить задачу «${item.title}». Стрелки вверх и вниз меняют порядок`"
      @pointerdown="handleGripPointerDown"
      @keydown="handleGripKeydown"
    >
      <TaskIcon name="grip" />
    </button>
    <span class="task-item__checkbox">
      <input
        :id="floating ? undefined : checkboxId"
        ref="inputRef"
        class="task-item__input"
        type="checkbox"
        :tabindex="floating ? -1 : undefined"
        :checked="item.completed"
        :aria-label="
          floating ? undefined : `Отметить задачу «${item.title}» ${item.completed ? 'невыполненной' : 'выполненной'}`
        "
        @change="handleCompletedChange"
      />
      <TaskIcon v-if="item.completed" class="task-item__check" name="check" />
    </span>
    <component :is="floating ? 'span' : 'label'" class="task-item__title" :for="floating ? undefined : checkboxId">
      {{ item.title }}
    </component>
    <button
      class="task-item__delete"
      type="button"
      :tabindex="floating ? -1 : undefined"
      :aria-label="floating ? undefined : `Удалить задачу «${item.title}»`"
      @click="emit('remove', item.id)"
    >
      <TaskIcon name="trash" />
    </button>
  </component>
</template>

<script setup lang="ts">
import TaskIcon from '../TaskIcon/TaskIcon.vue';
import type { Task } from '~/types/task';

export interface TaskDragStartPayload {
  id: string;
  event: PointerEvent;
  source: 'grip' | 'row';
  fromTitle: boolean;
}

const props = withDefaults(
  defineProps<{
    item: Task;
    draggable?: boolean;
    dragging?: boolean;
    floating?: boolean;
  }>(),
  {
    draggable: false,
    dragging: false,
    floating: false,
  },
);

const emit = defineEmits<{
  setCompleted: [id: string, completed: boolean];
  remove: [id: string];
  dragStart: [payload: TaskDragStartPayload];
  move: [id: string, offset: -1 | 1];
}>();

const checkboxId = useId();
const rootRef = ref<HTMLElement | null>(null);
const gripRef = ref<HTMLButtonElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

function handleCompletedChange(event: Event) {
  if (props.floating) return;
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;

  const completed = input.checked;
  // The displayed state changes only after the store saves successfully.
  input.checked = props.item.completed;
  emit('setCompleted', props.item.id, completed);
}

function handleGripPointerDown(event: PointerEvent) {
  if (!props.draggable || props.floating) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  event.stopPropagation();
  emit('dragStart', {
    id: props.item.id,
    event,
    source: 'grip',
    fromTitle: false,
  });
}

function handleRowPointerDown(event: PointerEvent) {
  if (!props.draggable || props.floating) return;
  if (event.pointerType !== 'mouse' || event.button !== 0) return;

  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest('.task-item__checkbox, .task-item__delete, .task-item__grip')) return;

  emit('dragStart', {
    id: props.item.id,
    event,
    source: 'row',
    fromTitle: Boolean(target.closest('.task-item__title')),
  });
}

function handleGripKeydown(event: KeyboardEvent) {
  if (!props.draggable || props.floating) return;
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    emit('move', props.item.id, -1);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    emit('move', props.item.id, 1);
  }
}

function focus() {
  if (!inputRef.value) return false;
  inputRef.value.focus();
  return true;
}

function focusGrip() {
  if (!gripRef.value) return false;
  gripRef.value.focus();
  return true;
}

function getElement() {
  return rootRef.value;
}

function hasFocus() {
  const active = document.activeElement;
  return Boolean(rootRef.value && active && rootRef.value.contains(active));
}

defineExpose({ focus, focusGrip, getElement, hasFocus });
</script>

<style lang="scss" scoped src="./style.scss"></style>
