<template>
  <div class="ai-proposal" :class="`ai-proposal--${proposalState.status}`">
    <div class="ai-proposal__head">
      <p class="ai-proposal__title">{{ headerTitle }}</p>
      <span v-if="showContextDateBadge" class="ai-proposal__context"
        >Для {{ formatShortDate(proposalState.contextDate) }}</span
      >
    </div>

    <p v-if="proposalState.proposal.type === 'split_task'" class="ai-proposal__hint">
      Исходная задача останется в списке, добавятся только выбранные шаги.
    </p>

    <ul v-if="proposalState.status !== 'dismissed'" class="ai-proposal__items">
      <li v-for="(item, index) in items" :key="`${index}-${item.title}`" class="ai-proposal__item">
        <label class="ai-proposal__label">
          <input
            type="checkbox"
            class="ai-proposal__checkbox"
            :checked="selectedSet.has(index)"
            :disabled="isLocked"
            @change="toggleIndex(index)"
          />
          <span class="ai-proposal__item-text">{{ item.title }}</span>
        </label>
        <span class="ai-proposal__date">{{ formatShortDate(item.scheduledDate) }}</span>
      </li>
    </ul>

    <div v-if="proposalState.status === 'pending' || proposalState.status === 'applying'" class="ai-proposal__actions">
      <button
        class="ai-proposal__apply"
        type="button"
        :disabled="!storageReady || isLocked || selectedIndices.length === 0"
        @click="handleApply"
      >
        {{ applyButtonLabel }}
      </button>
      <button
        class="ai-proposal__dismiss"
        type="button"
        :disabled="isLocked"
        @click="emit('dismiss', proposalState.proposal.id)"
      >
        Скрыть
      </button>
    </div>
    <p v-else-if="proposalState.status === 'applied'" class="ai-proposal__status">
      <TaskIcon name="check" />
      <span>Добавлено в список ({{ proposalState.appliedCount }})</span>
    </p>
    <p v-else class="ai-proposal__status ai-proposal__status--muted">Предложение скрыто</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { parseTaskDate, shiftTaskDate } from '#shared/utils/taskDate';
import TaskIcon from '~/components/Tasks/TaskIcon/TaskIcon.vue';
import { getProposalItems, type AiChatProposalState } from '~/utils/aiChatState';

const props = defineProps<{
  proposalState: AiChatProposalState;
  activeDate: string;
  todayDate: string;
  storageReady: boolean;
}>();

const emit = defineEmits<{
  apply: [proposalId: string, selectedIndices: number[]];
  dismiss: [proposalId: string];
}>();

const items = computed(() => getProposalItems(props.proposalState.proposal));
const selectedIndices = ref<number[]>([]);

watch(
  () => items.value.length,
  (len) => {
    selectedIndices.value = Array.from({ length: len }, (_v, idx) => idx);
  },
  { immediate: true },
);

const selectedSet = computed(() => new Set(selectedIndices.value));
const isLocked = computed(() => props.proposalState.status !== 'pending');
const showContextDateBadge = computed(() => props.proposalState.contextDate !== props.activeDate);

const headerTitle = computed(() => {
  const { proposal } = props.proposalState;
  if (proposal.type === 'split_task') return `Шаги: ${proposal.sourceTitle}`;
  return proposal.summary || 'Предлагаю добавить задачи';
});

const applyButtonLabel = computed(() => {
  if (props.proposalState.status === 'applying') return 'Добавляем…';
  if (items.value.length <= 1) return 'Добавить';
  return `Добавить (${selectedIndices.value.length})`;
});

function toggleIndex(index: number) {
  if (isLocked.value) return;
  if (selectedSet.value.has(index)) {
    selectedIndices.value = selectedIndices.value.filter((item) => item !== index);
  } else {
    selectedIndices.value = [...selectedIndices.value, index].sort((a, b) => a - b);
  }
}

function handleApply() {
  if (isLocked.value || !props.storageReady || selectedIndices.value.length === 0) return;
  emit('apply', props.proposalState.proposal.id, [...selectedIndices.value]);
}

function formatShortDate(dateValue: string): string {
  if (dateValue === props.todayDate) return 'Сегодня';
  const tomorrow = props.todayDate ? shiftTaskDate(props.todayDate, 1) : null;
  if (tomorrow && dateValue === tomorrow) return 'Завтра';

  const parsed = parseTaskDate(dateValue);
  if (!parsed) return dateValue;
  return parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
</script>

<style lang="scss" scoped src="./style.scss"></style>
