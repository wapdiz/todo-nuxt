<template>
  <section ref="rootRef" class="ai-chat" aria-label="Чат с ИИ-ассистентом" @keydown="handlePanelKeydown">
    <div class="ai-chat__panel">
      <header class="ai-chat__header">
        <div class="ai-chat__brand">
          <span class="ai-chat__badge"><TaskIcon name="sparkles" /></span>
          <h2 class="ai-chat__title">ИИ-помощник</h2>
        </div>
        <div class="ai-chat__header-actions">
          <button v-if="messages.length" class="ai-chat__clear" type="button" @click="handleClear">Очистить</button>
          <button
            v-if="showClose"
            class="ai-chat__close"
            type="button"
            aria-label="Закрыть ИИ-чат"
            @click="emit('close')"
          >
            <TaskIcon name="close" />
          </button>
        </div>
      </header>

      <div ref="threadRef" class="ai-chat__body">
        <div v-if="messages.length === 0 && !isPending" class="ai-chat__welcome">
          <div class="ai-chat__orb" aria-hidden="true"></div>
          <p class="ai-chat__welcome-title">Чем помочь?</p>
          <p class="ai-chat__welcome-text">
            Создам задачи из обычного текста на нужную дату или разобью сложную задачу на понятные шаги.
          </p>
        </div>

        <ul v-else class="ai-chat__messages" aria-live="polite">
          <li
            v-for="message in messages"
            :key="message.id"
            class="ai-chat__message"
            :class="`ai-chat__message--${message.role}`"
          >
            <p class="ai-chat__bubble">{{ message.text }}</p>
            <TaskAiProposalCard
              v-for="proposalState in message.proposals"
              :key="proposalState.proposal.id"
              :proposal-state="proposalState"
              :active-date="activeDate"
              :today-date="todayDate"
              :storage-ready="storageReady"
              @apply="(proposalId, selected) => emit('applyProposal', message.id, proposalId, selected)"
              @dismiss="(proposalId) => emit('dismissProposal', message.id, proposalId)"
            />
          </li>
          <li v-if="isPending" class="ai-chat__message ai-chat__message--assistant" aria-live="polite">
            <p class="ai-chat__bubble ai-chat__bubble--loading">Думаю над ответом…</p>
          </li>
        </ul>
      </div>

      <div v-if="error" class="ai-chat__error" role="alert">
        <span>{{ error }}</span>
        <button class="ai-chat__error-close" type="button" aria-label="Скрыть ошибку" @click="emit('dismissError')">
          <TaskIcon name="close" />
        </button>
      </div>

      <form class="ai-chat__composer" @submit.prevent="submitMessage">
        <textarea
          ref="inputRef"
          v-model="composer.state.draft"
          class="ai-chat__input"
          rows="2"
          :maxlength="AI_MAX_MESSAGE_LENGTH"
          aria-label="Сообщение для ИИ-помощника"
          placeholder="Спросите о задачах или напишите план…"
          :disabled="isPending"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
          @keydown.enter="handleEnter"
        ></textarea>
        <button class="ai-chat__send" type="submit" aria-label="Отправить сообщение" :disabled="!canSend">
          <TaskIcon name="arrow-up" />
        </button>
      </form>
      <p class="ai-chat__privacy">Сообщения и задачи выбранного дня отправляются в n8n и Gemini.</p>
    </div>

    <div class="ai-chat__quick">
      <div v-if="composer.state.isSplitPickerOpen" class="ai-chat__picker">
        <div class="ai-chat__picker-head">
          <p class="ai-chat__picker-title">Выберите задачу на {{ activeDateLabel }}</p>
          <button
            class="ai-chat__picker-close"
            type="button"
            aria-label="Закрыть выбор задачи"
            @click="composer.closeSplitPicker()"
          >
            <TaskIcon name="close" />
          </button>
        </div>
        <ul v-if="splitCandidates.length" class="ai-chat__picker-list">
          <li v-for="task in splitCandidates" :key="task.id">
            <button class="ai-chat__picker-item" type="button" :disabled="isPending" @click="sendSplitTask(task)">
              <span>{{ task.title }}</span>
            </button>
          </li>
        </ul>
        <p v-else class="ai-chat__picker-empty">На этот день нет задач. Опишите задачу в чате.</p>
      </div>

      <div class="ai-chat__quick-actions">
        <button class="ai-chat__quick-btn" type="button" :disabled="isPending" @click="prepareCreateFromText">
          <TaskIcon name="sparkles" />
          <span>Задачи из текста</span>
        </button>
        <button
          class="ai-chat__quick-btn"
          type="button"
          :disabled="isPending"
          :aria-expanded="dayTasks.length > 0 ? composer.state.isSplitPickerOpen : undefined"
          @click="toggleSplitPicker"
        >
          <TaskIcon name="split" />
          <span>Разбить на шаги</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { AiChatMode } from '#shared/types/aiChat';
import { AI_MAX_MESSAGE_LENGTH } from '#shared/utils/aiChat';
import { parseTaskDate } from '#shared/utils/taskDate';
import TaskAiProposalCard from '../TaskAiProposalCard/TaskAiProposalCard.vue';
import TaskIcon from '~/components/Tasks/TaskIcon/TaskIcon.vue';
import type { Task } from '~/types/task';
import { createAiComposerController, type AiChatMessage } from '~/utils/aiChatState';
import { focusFirstFocusable } from '~/utils/drawerFocus';

const props = withDefaults(
  defineProps<{
    messages: AiChatMessage[];
    isPending: boolean;
    error: string;
    activeDate: string;
    todayDate: string;
    dayTasks: Task[];
    storageReady: boolean;
    showClose?: boolean;
  }>(),
  {
    showClose: false,
  },
);

const emit = defineEmits<{
  send: [payload: { text: string; mode: AiChatMode }];
  applyProposal: [messageId: string, proposalId: string, selectedIndices: number[]];
  dismissProposal: [messageId: string, proposalId: string];
  clear: [];
  close: [];
  dismissError: [];
}>();

const composer = createAiComposerController({
  createState: (initial) => reactive(initial),
});
const isComposing = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const threadRef = ref<HTMLDivElement | null>(null);

const canSend = computed(() => composer.canSend(props.isPending));

const splitCandidates = computed(() => {
  const active = props.dayTasks.filter((task) => !task.completed);
  return active.length ? active : props.dayTasks;
});

const activeDateLabel = computed(() => {
  const date = parseTaskDate(props.activeDate);
  if (!date) return 'выбранный день';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
});

function handleEnter(event: KeyboardEvent) {
  if (isComposing.value || event.isComposing || event.keyCode === 229) {
    event.preventDefault();
    return;
  }
  if (!event.shiftKey) {
    event.preventDefault();
    submitMessage();
  }
}

function submitMessage() {
  const payload = composer.submit(props.isPending);
  if (!payload) return;
  emit('send', payload);
}

function prepareCreateFromText() {
  composer.prepareCreateFromText();
  focusInput();
}

function toggleSplitPicker() {
  if (!composer.toggleSplitPicker(props.dayTasks.length > 0)) {
    focusInput();
  }
}

function handlePanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && composer.state.isSplitPickerOpen) {
    event.preventDefault();
    event.stopPropagation();
    composer.closeSplitPicker();
  }
}

function sendSplitTask(task: Task) {
  if (props.isPending) return;
  emit('send', composer.prepareSplitTask(task.title));
}

function handleClear() {
  composer.reset();
  emit('clear');
}

function focusInput() {
  nextTick(() => {
    const el = inputRef.value;
    if (!el || el.disabled) {
      focusFirstFocusable(rootRef.value);
      return;
    }
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  });
}

function restoreDraft(text: string, mode: AiChatMode = 'chat') {
  composer.restoreDraft(text, mode);
  focusInput();
}

watch(
  () => [props.messages.length, props.isPending],
  () => {
    nextTick(() => {
      if (threadRef.value) {
        threadRef.value.scrollTop = threadRef.value.scrollHeight;
      }
    });
  },
);

watch(
  () => props.activeDate,
  () => {
    composer.closeSplitPicker();
  },
);

defineExpose({ focusInput, restoreDraft });
</script>

<style lang="scss" scoped src="./style.scss"></style>
