<template>
  <section class="task-list" aria-labelledby="task-list-heading">
    <header class="task-list__header">
      <h2 id="task-list-heading" class="task-list__heading">Все задачи</h2>
      <p class="task-list__count">{{ completedCount }} из {{ items.length }} выполнено</p>
    </header>
    <ul v-if="items.length" class="task-list__items" aria-label="Все задачи">
      <TaskItem
        v-for="item in items"
        :key="item.id"
        :ref="(component) => setItemRef(item.id, component)"
        :item="item"
        @set-completed="(id, completed) => emit('setCompleted', id, completed)"
        @remove="emit('remove', $event)"
      />
    </ul>
    <p v-else class="task-list__empty">Задач пока нет. Добавьте первую выше.</p>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue';
import TaskItem from '../TaskItem/TaskItem.vue';
import type { Task } from '~/types/task';

const props = defineProps<{ items: Task[] }>();
const emit = defineEmits<{
  setCompleted: [id: string, completed: boolean];
  remove: [id: string];
}>();

const completedCount = computed(() => props.items.filter((item) => item.completed).length);
const itemRefs = new Map<string, { focus: () => boolean }>();

function setItemRef(id: string, component: unknown) {
  if (component && typeof component === 'object' && 'focus' in component && typeof component.focus === 'function') {
    itemRefs.set(id, component as { focus: () => boolean });
  } else {
    itemRefs.delete(id);
  }
}

async function focusTask(id: string) {
  await nextTick();
  return itemRefs.get(id)?.focus() ?? false;
}

defineExpose({ focusTask });
</script>

<style lang="scss" scoped src="./style.scss"></style>
