<template>
  <section class="task-list" aria-labelledby="task-list-heading">
    <header class="task-list__header">
      <h2 id="task-list-heading" class="task-list__heading">На сегодня</h2>
      <p class="task-list__count">{{ completedCount }} из {{ items.length }} выполнено</p>
    </header>
    <ul v-if="items.length" class="task-list__items" aria-label="Задачи на сегодня">
      <TaskItem v-for="item in items" :key="item.id" :item="item" />
    </ul>
    <p v-else class="task-list__empty">Задач пока нет.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TaskItem from '../TaskItem/TaskItem.vue';

const props = defineProps<{
  items: {
    id: string;
    title: string;
    completed: boolean;
  }[];
}>();

const completedCount = computed(() => props.items.filter((item) => item.completed).length);
</script>

<style lang="scss" scoped src="./style.scss"></style>
