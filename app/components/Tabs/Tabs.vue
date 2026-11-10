<template>
  <div class="tabs">
    <ul v-if="hasTabs" class="tabs__header" role="tablist" :aria-label="ariaLabel" :aria-orientation="orientation">
      <li v-for="(tab, index) in tabs" :key="tab.id" role="presentation">
        <button
          :id="generateTabId(tab.id)"
          :class="['tabs__button', { 'tabs__button--active': activeTab === tab.id }]"
          role="tab"
          :tabindex="activeTab === tab.id ? '0' : '-1'"
          :aria-selected="activeTab === tab.id"
          :aria-controls="generatePanelId(tab.id)"
          :aria-label="tab.title || tab.shortName"
          :aria-current="activeTab === tab.id ? 'page' : false"
          :aria-labelledby="generateLabelId(tab.id)"
          @click="setActiveTab(tab.id)"
          @keydown="onKeydown($event, index)"
        >
          <span :id="generateLabelId(tab.id)">{{ tab.shortName || tab.title }}</span>
        </button>
      </li>
    </ul>

    <div v-if="hasTabs" class="tabs__content">
      <transition name="fade" mode="out-in">
        <div
          v-if="activeTab"
          :id="generatePanelId(activeTab)"
          :key="activeTab"
          class="tabs__panel"
          role="tabpanel"
          :aria-labelledby="generateTabId(activeTab)"
          tabindex="0"
        >
          <slot :name="currentSlotName"></slot>
        </div>
      </transition>
    </div>

    <div v-else class="tabs__empty">
      <slot name="empty">
        <p>Нет вкладок для отображения</p>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted } from 'vue';
import { useId } from '#imports';

interface Tab {
  id: string;
  title: string;
  slotName: string;
  shortName?: string;
}

interface Props {
  tabs?: Tab[];
  initialTab?: string;
  ariaLabel?: string;
  orientation?: 'horizontal' | 'vertical';
}

const componentId = useId();
const generateTabId = (tabId: string) => `${componentId}-tab-${tabId}`;
const generateLabelId = (tabId: string) => `${componentId}-label-${tabId}`;
const generatePanelId = (tabId: string) => `${componentId}-panel-${tabId}`;

const props = withDefaults(defineProps<Props>(), {
  tabs: () => [],
  initialTab: '',
  ariaLabel: 'Переключение вкладок',
  orientation: 'horizontal',
});

const emit = defineEmits<{
  change: [tabId: string];
}>();

const activeTab = ref<string>('');
const tabButtons = ref<HTMLElement[]>([]);

const hasTabs = computed(() => {
  return props.tabs && props.tabs.length > 0;
});

const currentTabIndex = computed(() => {
  if (!hasTabs.value) return -1;
  return props.tabs!.findIndex((tab) => tab.id === activeTab.value);
});

const currentTab = computed(() => {
  if (!hasTabs.value) return null;
  return props.tabs!.find((tab) => tab.id === activeTab.value);
});

const currentSlotName = computed(() => {
  return currentTab.value?.slotName || '';
});

const setActiveTab = (tabId: string) => {
  if (tabId === activeTab.value) return;

  activeTab.value = tabId;
  emit('change', tabId);
};

const focusTabButton = (index: number) => {
  nextTick(() => {
    const button = tabButtons.value[index];
    if (button) {
      button.focus();
    }
  });
};

const onKeydown = (event: KeyboardEvent, index: number) => {
  if (!hasTabs.value) return;

  const key = event.key;
  const lastIndex = props.tabs!.length - 1;
  let newIndex: number | null = null;

  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown': {
      if (props.orientation === 'vertical' && key === 'ArrowDown') {
        newIndex = currentTabIndex.value === lastIndex ? 0 : currentTabIndex.value + 1;
      } else if (props.orientation === 'horizontal' && key === 'ArrowRight') {
        newIndex = currentTabIndex.value === lastIndex ? 0 : currentTabIndex.value + 1;
      }
      break;
    }

    case 'ArrowLeft':
    case 'ArrowUp': {
      if (props.orientation === 'vertical' && key === 'ArrowUp') {
        newIndex = currentTabIndex.value === 0 ? lastIndex : currentTabIndex.value - 1;
      } else if (props.orientation === 'horizontal' && key === 'ArrowLeft') {
        newIndex = currentTabIndex.value === 0 ? lastIndex : currentTabIndex.value - 1;
      }
      break;
    }

    case 'Home': {
      newIndex = 0;
      break;
    }

    case 'End': {
      newIndex = lastIndex;
      break;
    }

    case 'Enter':
    case ' ': {
      event.preventDefault();
      const tab = props.tabs![index];
      if (tab) {
        setActiveTab(tab.id);
      }
      return;
    }

    default:
      return;
  }

  if (newIndex !== null && newIndex >= 0 && newIndex < props.tabs!.length) {
    event.preventDefault();
    const newTab = props.tabs![newIndex];
    if (newTab) {
      setActiveTab(newTab.id);
      focusTabButton(newIndex);
    }
  }
};

const initializeActiveTab = () => {
  if (!hasTabs.value) {
    activeTab.value = '';
    return;
  }

  if (props.initialTab && props.tabs!.some((tab) => tab.id === props.initialTab)) {
    activeTab.value = props.initialTab;
  } else if (hasTabs.value) {
    const firstTab = props.tabs![0];
    if (firstTab) {
      activeTab.value = firstTab.id;
    }
  }
};

onMounted(() => {
  initializeActiveTab();
});

watch(
  () => props.tabs,
  (newTabs) => {
    if (!newTabs || newTabs.length === 0) {
      activeTab.value = '';
      return;
    }

    const currentTabExists = newTabs.some((tab) => tab.id === activeTab.value);

    if (!currentTabExists) {
      const firstTab = newTabs[0];
      if (firstTab) {
        activeTab.value = firstTab.id;
      }
    }

    tabButtons.value = [];
  },
  { immediate: true },
);

watch(
  () => props.initialTab,
  (newInitialTab) => {
    if (newInitialTab && hasTabs.value && props.tabs!.some((tab) => tab.id === newInitialTab)) {
      activeTab.value = newInitialTab;
    }
  },
);
</script>

<style scoped>
@import './style.scss';
</style>
