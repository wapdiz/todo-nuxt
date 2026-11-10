<template>
  <ClientOnly>
    <Tippy class="tooltip" :placement="placementSafe" :interactive="true" :arrow="arrow" max-width="none" tabindex="0">
      <svg-icon name="i" class="icon" aria-hidden="true" />

      <template #content>
        <span v-if="$slots.content" class="content" role="tooltip">
          <slot name="content" />
        </span>
        <span v-else class="content" v-html="content" />
      </template>
    </Tippy>
  </ClientOnly>
</template>

<script setup>
import { Tippy } from 'vue-tippy';
import { ref } from 'vue';
import { useMatchMedia } from '#imports';

const props = defineProps({
  placement: {
    type: String,
    default: 'top',
  },
  content: {
    type: String,
    default: '',
  },
});
const mm = useMatchMedia();
const placementSafe = ref(props.placement);

watch(mm.isDevices, (value) => {
  placementSafe.value = value ? 'top' : props.placement;
});

const arrow = `
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="21" viewBox="0 0 18 21" fill="none">
  <path d="M0 10.5L18 0V21L0 10.5Z" fill="white"/>
</svg>
`;
</script>

<style scoped>
@import 'index.scss';
</style>
