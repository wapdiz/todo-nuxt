<template>
  <section
    class="task-list"
    :class="{ 'task-list--dragging': Boolean(dragSession?.active) }"
    aria-labelledby="task-list-heading"
  >
    <header class="task-list__header">
      <h2 id="task-list-heading" class="task-list__heading">{{ heading }}</h2>
      <p class="task-list__count">{{ effectiveCompletedCount }} из {{ effectiveTotalCount }} выполнено</p>
    </header>
    <p class="visually-hidden" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
    <div v-if="items.length" ref="listWrapRef" class="task-list__wrap">
      <TransitionGroup
        name="task-list"
        tag="ul"
        class="task-list__items"
        :class="{ 'task-list__items--reordering': isReordering }"
        :aria-label="heading"
      >
        <TaskItem
          v-for="item in displayedItems"
          :key="item.id"
          :ref="(component) => setItemRef(item.id, component)"
          :item="item"
          :draggable="canReorder"
          :dragging="Boolean(dragSession?.active && dragSession.id === item.id)"
          @set-completed="(id, completed) => emit('setCompleted', id, completed)"
          @remove="emit('remove', $event)"
          @drag-start="startDrag"
          @move="moveItem"
        />
      </TransitionGroup>
    </div>
    <p v-else class="task-list__empty">{{ emptyText }}</p>

    <div
      v-if="floatingItem && dragSession?.active"
      class="task-list__floating"
      :style="floatingStyle"
      aria-hidden="true"
    >
      <TaskItem :item="floatingItem" draggable floating />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import TaskItem, { type TaskDragStartPayload } from '../TaskItem/TaskItem.vue';
import type { Task } from '~/types/task';
import { moveTaskId, type TaskDragSlot } from '~/utils/taskCalendar';
import { createBrowserDragHost, createTaskDragController, type TaskDragState } from '~/utils/taskDragSession';

interface TaskItemHandle {
  focus: () => boolean;
  focusGrip: () => boolean;
  getElement: () => HTMLElement | null;
  hasFocus: () => boolean;
}

const REORDER_TRANSITION_MS = 220;

const props = withDefaults(
  defineProps<{
    items: Task[];
    heading?: string;
    totalCount?: number;
    completedCount?: number;
    reorderDisabled?: boolean;
    emptyText?: string;
  }>(),
  {
    heading: 'На выбранный день',
    totalCount: undefined,
    completedCount: undefined,
    reorderDisabled: false,
    emptyText: 'На этот день задач нет.',
  },
);
const emit = defineEmits<{
  setCompleted: [id: string, completed: boolean];
  remove: [id: string];
  reorder: [orderedIds: string[]];
}>();

const listWrapRef = ref<HTMLDivElement | null>(null);
const dragSession = ref<TaskDragState | null>(null);
const announcement = ref('');
const isKeyboardReordering = ref(false);
let keyboardTimer: number | null = null;

const effectiveTotalCount = computed(() => props.totalCount ?? props.items.length);
const effectiveCompletedCount = computed(
  () => props.completedCount ?? props.items.filter((item) => item.completed).length,
);
const canReorder = computed(() => !props.reorderDisabled && props.items.length > 1);
const isReordering = computed(() => Boolean(dragSession.value?.active) || isKeyboardReordering.value);

const displayedItems = computed(() => {
  const session = dragSession.value;
  if (!session?.active) return props.items;
  const byId = new Map(props.items.map((item) => [item.id, item]));
  return session.slots.map((slot) => byId.get(slot.id)).filter((item): item is Task => Boolean(item));
});

const floatingItem = computed(() => {
  const session = dragSession.value;
  if (!session?.active) return null;
  return props.items.find((item) => item.id === session.id) ?? null;
});

const floatingStyle = computed(() => {
  const session = dragSession.value;
  if (!session?.active) return undefined;

  return {
    left: `${session.startLeft}px`,
    width: `${session.startWidth}px`,
    transform: `translate3d(0, ${session.lastY - session.grabOffsetY}px, 0)`,
  };
});

const itemRefs = new Map<string, TaskItemHandle>();

const dragController = createTaskDragController({
  host: createBrowserDragHost(() => listWrapRef.value?.getBoundingClientRect().top ?? null),
  onStateChange: (state) => {
    dragSession.value = state;
  },
  onCommit: (draggedId, orderedIds) => {
    void commitDragReorder(draggedId, orderedIds);
  },
});

function setItemRef(id: string, component: unknown) {
  if (
    component &&
    typeof component === 'object' &&
    'focus' in component &&
    typeof component.focus === 'function' &&
    'focusGrip' in component &&
    typeof component.focusGrip === 'function' &&
    'getElement' in component &&
    typeof component.getElement === 'function' &&
    'hasFocus' in component &&
    typeof component.hasFocus === 'function'
  ) {
    itemRefs.set(id, component as TaskItemHandle);
  } else {
    itemRefs.delete(id);
  }
}

async function commitDragReorder(draggedId: string, orderedIds: string[]) {
  const initialIds = props.items.map((item) => item.id);
  const orderChanged = orderedIds.some((id, index) => id !== initialIds[index]);
  if (!orderChanged) return;

  const targetIndex = orderedIds.indexOf(draggedId);
  const movedTask = props.items.find((item) => item.id === draggedId);

  emit('reorder', orderedIds);
  await nextTick();
  if (movedTask && props.items[targetIndex]?.id === draggedId) {
    announcement.value = `Задача «${movedTask.title}» перемещена: ${targetIndex + 1} из ${props.items.length}.`;
  }
}

function startDrag(payload: TaskDragStartPayload) {
  if (!canReorder.value) return;

  const slots: TaskDragSlot[] = [];
  for (const item of props.items) {
    const element = itemRefs.get(item.id)?.getElement();
    if (!element) return;
    slots.push({ id: item.id, height: element.getBoundingClientRect().height });
  }

  const draggedEl = itemRefs.get(payload.id)?.getElement();
  const firstEl = itemRefs.get(props.items[0]!.id)?.getElement();
  const secondEl = itemRefs.get(props.items[1]!.id)?.getElement();
  if (!draggedEl || !firstEl || !secondEl) return;

  const draggedRect = draggedEl.getBoundingClientRect();
  const gap = Math.max(0, secondEl.getBoundingClientRect().top - firstEl.getBoundingClientRect().bottom);

  dragController.start({
    id: payload.id,
    pointerId: payload.event.pointerId,
    source: payload.source,
    fromTitle: payload.fromTitle,
    clientX: payload.event.clientX,
    clientY: payload.event.clientY,
    grabOffsetY: payload.event.clientY - draggedRect.top,
    startLeft: draggedRect.left,
    startWidth: draggedRect.width,
    gap,
    slots,
  });
}

async function moveItem(id: string, offset: -1 | 1) {
  if (!canReorder.value) return;
  const currentIds = props.items.map((item) => item.id);
  const nextIds = moveTaskId(currentIds, id, offset);
  if (!nextIds) return;

  const targetIndex = nextIds.indexOf(id);
  const movedTask = props.items.find((item) => item.id === id);

  if (keyboardTimer !== null) window.clearTimeout(keyboardTimer);
  isKeyboardReordering.value = true;
  keyboardTimer = window.setTimeout(() => {
    isKeyboardReordering.value = false;
    keyboardTimer = null;
  }, REORDER_TRANSITION_MS);

  emit('reorder', nextIds);
  await nextTick();
  itemRefs.get(id)?.focusGrip();

  if (movedTask && props.items[targetIndex]?.id === id) {
    announcement.value = `Задача «${movedTask.title}» перемещена: ${targetIndex + 1} из ${props.items.length}.`;
  }
}

watch([() => props.items, canReorder], () => {
  dragController.cancel(true);
});

onBeforeUnmount(() => {
  dragController.dispose();
  if (keyboardTimer !== null) {
    window.clearTimeout(keyboardTimer);
    keyboardTimer = null;
  }
});

async function focusTask(id: string) {
  await nextTick();
  return itemRefs.get(id)?.focus() ?? false;
}

function isTaskFocused(id: string) {
  return itemRefs.get(id)?.hasFocus() ?? false;
}

function setAnnouncement(text: string) {
  announcement.value = text;
}

defineExpose({ focusTask, isTaskFocused, setAnnouncement });
</script>

<style lang="scss" scoped src="./style.scss"></style>
