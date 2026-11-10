<template>
  <div class="task-form">
    <form class="task-form__field" @submit.prevent="submit">
      <TaskIcon class="task-form__icon" name="plus" />
      <input
        ref="inputRef"
        v-model="draft"
        class="task-form__input"
        type="text"
        name="task-title"
        aria-label="Название новой задачи"
        placeholder="Что нужно сделать?"
        :maxlength="TASK_TITLE_MAX_LENGTH"
        :disabled="disabled"
        :aria-describedby="noteId"
        :aria-invalid="error ? true : undefined"
        autocomplete="off"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
        @keydown.enter="handleEnter"
      />
      <button class="task-form__submit" type="submit" :disabled="!canSubmit">Добавить</button>
    </form>
    <p
      :id="noteId"
      class="task-form__note"
      :class="{ 'task-form__note--error': error }"
      :role="error ? 'alert' : undefined"
    >
      {{ error || note }}
    </p>
  </div>
</template>

<script setup lang="ts">
import TaskIcon from '../TaskIcon/TaskIcon.vue';
import { TASK_TITLE_MAX_LENGTH } from '~/types/task';

const props = withDefaults(defineProps<{ error?: string; disabled?: boolean; note?: string }>(), {
  error: '',
  disabled: false,
  note: 'Задачи сохраняются в этом браузере.',
});
const emit = defineEmits<{ add: [title: string] }>();

const noteId = useId();
const inputRef = ref<HTMLInputElement | null>(null);
const draft = ref('');
const isComposing = ref(false);
const title = computed(() => draft.value.trim());
const canSubmit = computed(
  () => !props.disabled && title.value.length > 0 && title.value.length <= TASK_TITLE_MAX_LENGTH,
);

function handleEnter(event: KeyboardEvent) {
  if (isComposing.value || event.isComposing || event.keyCode === 229) event.preventDefault();
}

function submit() {
  if (!canSubmit.value || isComposing.value) return;
  emit('add', title.value);
}

function focus() {
  inputRef.value?.focus();
}

function reset() {
  draft.value = '';
  focus();
}

defineExpose({ focus, reset });
</script>

<style lang="scss" scoped src="./style.scss"></style>
