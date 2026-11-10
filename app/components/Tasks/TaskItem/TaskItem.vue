<template>
  <li class="task-item" :class="{ 'task-item--completed': item.completed }">
    <TaskIcon class="task-item__grip" name="grip" />
    <span class="task-item__checkbox">
      <input
        class="task-item__input"
        type="checkbox"
        :checked="item.completed"
        :aria-label="`Отметить задачу «${item.title}» ${item.completed ? 'невыполненной' : 'выполненной'}`"
        disabled
      />
      <TaskIcon v-if="item.completed" class="task-item__check" name="check" />
    </span>
    <span class="task-item__title">{{ item.title }}</span>
    <button class="task-item__delete" type="button" :aria-label="`Удалить задачу «${item.title}»`" disabled>
      <TaskIcon name="trash" />
    </button>
  </li>
</template>

<script setup lang="ts">
import TaskIcon from '../TaskIcon/TaskIcon.vue';

defineProps<{
  item: {
    id: string;
    title: string;
    completed: boolean;
  };
}>();
</script>

<style lang="scss" scoped src="./style.scss"></style>
