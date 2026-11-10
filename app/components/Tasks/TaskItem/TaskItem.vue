<template>
  <li class="task-item" :class="{ 'task-item--completed': item.completed }">
    <TaskIcon class="task-item__grip" name="grip" />
    <span class="task-item__checkbox">
      <input
        :id="checkboxId"
        ref="inputRef"
        class="task-item__input"
        type="checkbox"
        :checked="item.completed"
        :aria-label="`Отметить задачу «${item.title}» ${item.completed ? 'невыполненной' : 'выполненной'}`"
        @change="handleCompletedChange"
      />
      <TaskIcon v-if="item.completed" class="task-item__check" name="check" />
    </span>
    <label class="task-item__title" :for="checkboxId">{{ item.title }}</label>
    <button
      class="task-item__delete"
      type="button"
      :aria-label="`Удалить задачу «${item.title}»`"
      @click="emit('remove', item.id)"
    >
      <TaskIcon name="trash" />
    </button>
  </li>
</template>

<script setup lang="ts">
import TaskIcon from '../TaskIcon/TaskIcon.vue';
import type { Task } from '~/types/task';

const props = defineProps<{ item: Task }>();
const emit = defineEmits<{
  setCompleted: [id: string, completed: boolean];
  remove: [id: string];
}>();
const checkboxId = useId();
const inputRef = ref<HTMLInputElement | null>(null);

function handleCompletedChange(event: Event) {
  const input = event.target;
  if (input instanceof HTMLInputElement) emit('setCompleted', props.item.id, input.checked);
}

function focus() {
  if (!inputRef.value) return false;
  inputRef.value.focus();
  return true;
}

defineExpose({ focus });
</script>

<style lang="scss" scoped src="./style.scss"></style>
