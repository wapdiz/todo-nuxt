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
        :disabled="disabled || isVoiceTranscribing"
        :aria-describedby="noteId"
        :aria-invalid="error ? true : undefined"
        autocomplete="off"
        @input="handleManualInput"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
        @keydown.enter="handleEnter"
      />
      <button
        class="task-form__mic"
        :class="{
          'task-form__mic--recording': isVoiceRecording,
          'task-form__mic--busy': isVoiceStarting || isVoiceTranscribing,
        }"
        type="button"
        :aria-label="micButtonLabel"
        :aria-pressed="isVoiceRecording"
        :title="micButtonLabel"
        :disabled="disabled || isVoiceTranscribing"
        @click="toggleVoice"
      >
        <TaskIcon :name="isVoiceRecording ? 'stop' : 'mic'" />
      </button>
      <button class="task-form__submit" type="submit" :disabled="!canSubmit">Добавить</button>
    </form>
    <p
      :id="noteId"
      class="task-form__note"
      :class="{ 'task-form__note--error': hasErrorNote }"
      :role="hasErrorNote ? 'alert' : undefined"
    >
      {{ activeNote }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from 'vue';
import type { AiTranscribeResponse } from '#shared/types/aiTranscribe';
import { mergeTranscribedDraft } from '#shared/utils/aiTranscribe';
import TaskIcon from '../TaskIcon/TaskIcon.vue';
import { TASK_TITLE_MAX_LENGTH } from '~/types/task';
import { createVoiceRecorderController, formatVoiceDuration } from '~/utils/voiceRecorder';

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
const voiceNotice = ref('');

const voice = createVoiceRecorderController({
  createState: (initial) => reactive(initial),
  transcribeAudio: (payload, signal) =>
    $fetch<AiTranscribeResponse>('/api/ai-transcribe', {
      method: 'POST',
      body: payload,
      signal,
    }),
  onTranscript(text) {
    const merged = mergeTranscribedDraft(draft.value, text, TASK_TITLE_MAX_LENGTH);
    draft.value = merged.value;
    voiceNotice.value = merged.truncated
      ? `Текст сокращён до ${TASK_TITLE_MAX_LENGTH} символов. Проверьте перед добавлением.`
      : '';
    focusAtEnd();
  },
  onEmptyTranscript() {
    voiceNotice.value = 'Речь не распознана. Попробуйте сказать чуть громче.';
    focusAtEnd();
  },
});

const isVoiceStarting = computed(() => voice.state.status === 'starting');
const isVoiceRecording = computed(() => voice.state.status === 'recording');
const isVoiceTranscribing = computed(() => voice.state.status === 'transcribing');

const micButtonLabel = computed(() => {
  if (isVoiceRecording.value) return 'Остановить запись голоса';
  if (isVoiceStarting.value) return 'Отменить включение микрофона';
  if (isVoiceTranscribing.value) return 'Расшифровываем речь';
  return 'Надиктовать задачу голосом';
});

const hasErrorNote = computed(() => Boolean(props.error || voice.state.error));
const activeNote = computed(() => {
  if (props.error) return props.error;
  if (voice.state.error) return voice.state.error;
  if (isVoiceStarting.value) return 'Запрашиваем доступ к микрофону…';
  if (isVoiceRecording.value) {
    return `Идёт запись ${formatVoiceDuration(voice.state.elapsedMs)} — нажмите стоп, чтобы распознать.`;
  }
  if (isVoiceTranscribing.value) return 'Расшифровываем речь…';
  if (voiceNotice.value) return voiceNotice.value;
  return props.note;
});

const title = computed(() => draft.value.trim());
const canSubmit = computed(
  () =>
    !props.disabled &&
    voice.state.status === 'idle' &&
    title.value.length > 0 &&
    title.value.length <= TASK_TITLE_MAX_LENGTH,
);

function handleEnter(event: KeyboardEvent) {
  if (isComposing.value || event.isComposing || event.keyCode === 229) event.preventDefault();
}

function handleManualInput() {
  voiceNotice.value = '';
  voice.clearError();
}

function toggleVoice() {
  voiceNotice.value = '';
  voice.toggle();
}

function submit() {
  if (!canSubmit.value || isComposing.value) return;
  voiceNotice.value = '';
  voice.clearError();
  emit('add', title.value);
}

function focusAtEnd() {
  nextTick(() => {
    const el = inputRef.value;
    if (!el || el.disabled) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  });
}

function focus() {
  inputRef.value?.focus();
}

function reset() {
  voice.cancel();
  voiceNotice.value = '';
  draft.value = '';
  focus();
}

watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled) voice.cancel();
  },
);

onBeforeUnmount(() => {
  voice.dispose();
});

defineExpose({ focus, reset, cancelVoice: () => voice.cancel() });
</script>

<style lang="scss" scoped src="./style.scss"></style>
