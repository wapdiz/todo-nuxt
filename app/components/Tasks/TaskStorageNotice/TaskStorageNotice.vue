<template>
  <section class="task-storage-notice" role="alert" :aria-labelledby="titleId">
    <h2 :id="titleId" class="task-storage-notice__title">{{ title }}</h2>
    <p class="task-storage-notice__message">{{ message }}</p>
    <div v-if="!loaded" class="task-storage-notice__actions">
      <button
        ref="retryRef"
        class="task-storage-notice__button task-storage-notice__retry"
        type="button"
        @click="emit('retry')"
      >
        Загрузить задачи
      </button>
      <button
        v-if="canReset"
        class="task-storage-notice__button task-storage-notice__reset"
        type="button"
        @click="emit('reset')"
      >
        Начать новый список
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TaskStorageIssue } from '~/utils/taskStorage';

const props = defineProps<{ issue: TaskStorageIssue; loaded: boolean }>();
const emit = defineEmits<{ retry: []; reset: [] }>();
const titleId = useId();
const retryRef = ref<HTMLButtonElement | null>(null);
const canReset = computed(() => props.issue === 'invalid-data' || props.issue === 'unsupported-version');

const title = computed(() => {
  if (props.issue === 'conflict') return 'Список изменился';
  if (props.issue === 'not-initialized') return 'Сначала загрузите задачи';
  return props.loaded ? 'Изменения не сохранены' : 'Не удалось загрузить задачи';
});

const message = computed(() => {
  const messages: Record<TaskStorageIssue, string> = {
    'invalid-data':
      'Не удалось прочитать сохранённые задачи. Исходные данные не изменены. Попробуйте загрузить их снова или начните новый список.',
    'unsupported-version':
      'Список сохранён в другой версии приложения. Исходные данные не изменены. Откройте совместимую версию приложения или начните новый список.',
    'quota-exceeded':
      'В хранилище браузера недостаточно места. Список не изменён. Освободите место и повторите действие.',
    'write-error':
      'Не удалось сохранить изменения. Список не изменён. Проверьте разрешения браузера и повторите действие.',
    unavailable: props.loaded
      ? 'Хранение данных недоступно. Список не изменён. Разрешите хранение данных в браузере и повторите действие.'
      : 'Не удалось прочитать задачи. Разрешите хранение данных в браузере и загрузите список снова.',
    conflict:
      'Список изменился в другой вкладке. Загрузите актуальные задачи или обновите страницу, прежде чем продолжать.',
    'not-initialized': 'Задачи ещё не загружены. Загрузите список, прежде чем вносить изменения.',
  };
  return messages[props.issue];
});

function focusRetry() {
  if (!retryRef.value) return false;
  retryRef.value.focus();
  return true;
}

defineExpose({ focusRetry });
</script>

<style lang="scss" scoped src="./style.scss"></style>
