<template>
  <svg
    class="task-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="path in paths[name]" :key="path" :d="path" />
  </svg>
</template>

<script setup lang="ts">
type IconName =
  | 'check'
  | 'plus'
  | 'chevron-left'
  | 'chevron-right'
  | 'panel'
  | 'calendar'
  | 'list'
  | 'sun'
  | 'trash'
  | 'dots'
  | 'grip'
  | 'close'
  | 'sliders'
  | 'sparkles'
  | 'arrow-up'
  | 'split';

defineProps<{ name: IconName }>();

const paths: Record<IconName, string[]> = {
  check: ['m6 12 4 4 8-8'],
  plus: ['M12 5v14M5 12h14'],
  'chevron-left': ['m14 6-6 6 6 6'],
  'chevron-right': ['m10 6 6 6-6 6'],
  panel: ['M9 4v16', 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z'],
  calendar: ['M8 3v4m8-4v4M4 10h16', 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z'],
  list: ['M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01'],
  sun: [
    'M12 3v1m0 16v1M3 12h1m16 0h1M5.6 5.6l.7.7m11.4 11.4.7.7m0-12.8-.7.7M6.3 17.7l-.7.7',
    'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  ],
  trash: ['M4 6h16M9 6V4h6v2m-9 0 1 14h10l1-14M10 10v6m4-6v6'],
  dots: ['M12 5h.01M12 12h.01M12 19h.01'],
  grip: ['M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01'],
  close: ['m6 6 12 12M18 6 6 18'],
  sliders: ['M4 7h10M18 7h2M14 5v4M4 12h4M12 12h8M8 10v4M4 17h12M20 17h0M16 15v4'],
  sparkles: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z', 'M19 3v4M21 5h-4'],
  'arrow-up': ['M12 19V5M6 11l6-6 6 6'],
  split: ['M6 5v6a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v2', 'M18 5v4M15 8l3-3 3 3M6 14v5'],
};
</script>

<style lang="scss" scoped>
.task-icon {
  display: block;
  flex: 0 0 auto;
  width: 1em;
  height: 1em;
}
</style>
