<template>
  <div class="task-form">
    <form class="task-form__field" :aria-describedby="noteId" @submit.prevent>
      <TaskIcon class="task-form__icon" name="plus" />
      <input
        ref="inputRef"
        class="task-form__input"
        type="text"
        name="task-title"
        aria-label="Название новой задачи"
        placeholder="Что нужно сделать?"
        maxlength="200"
        autocomplete="off"
      />
      <button class="task-form__submit" type="submit" disabled>Добавить</button>
    </form>
    <p :id="noteId" class="task-form__note">Это пример списка. Добавление и изменение задач пока недоступны.</p>
  </div>
</template>

<script setup lang="ts">
import TaskIcon from '../TaskIcon/TaskIcon.vue';

const noteId = useId();
const inputRef = ref<HTMLInputElement | null>(null);

defineExpose({ focus: () => inputRef.value?.focus() });
</script>

<style lang="scss" scoped src="./style.scss"></style>
