<template>
  <div :class="classList">
    <div ref="stickyInnerRef" class="sticky-container__inner" v-bind="$attrs">
      <slot></slot>
    </div>
    <div ref="overlayRef" class="sticky-container__overlay"></div>
    <div ref="emptyBlockRef" class="empty-scroll-block"></div>
  </div>
</template>

<script setup lang="ts">
import throttle from 'lodash.throttle';
import { ref } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import debounce from 'lodash.debounce';
gsap.registerPlugin(ScrollTrigger);

const props = withDefaults(
  defineProps<{
    maxStickyHeight?: number;
    mobileDisabled?: boolean;
    shading?: boolean;
  }>(),
  {
    maxStickyHeight: undefined,
  },
);

const classList = computed(() => ({
  'sticky-container': true,
  'sticky-container--mobile-disabled': props.mobileDisabled,
}));

const { isDevices } = useMatchMedia();
const stickyInnerRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);
const emptyBlockRef = ref<HTMLElement | null>(null);

let resizeObserver: ResizeObserver | null = null;
let animation: gsap.core.Timeline | null = null;
let lastWidth = 0;

// methods
const updateHeightVar = throttle((el: HTMLElement) => {
  if (!el) return;

  const height = el.getBoundingClientRect().height;

  el.style.setProperty('--sticky-height', `${Math.round(height)}px`);
}, 10);

const initShading = () => {
  if (animation) {
    animation.kill();
  }

  if (!props.shading) return;
  if (isDevices.value && props.mobileDisabled) return;

  animation = gsap.timeline({
    scrollTrigger: {
      trigger: emptyBlockRef.value,
      start: 'top 75%',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
      // markers: true,
    },
  });

  animation.fromTo(
    overlayRef.value,
    {
      opacity: 0,
    },
    {
      opacity: 1,
      duration: 0.5,
    },
  );
};

const resizeHandler = debounce(() => {
  if (lastWidth === window.innerWidth && isDevices.value) return;
  lastWidth = window.innerWidth;

  initShading();
}, 100);

// hooks and init
watch(isDevices, () => {
  initShading();
});

onMounted(async () => {
  await nextTick();

  const el = stickyInnerRef.value;
  if (!el) return;

  updateHeightVar(el);

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      updateHeightVar(entry.target as HTMLElement);
    }
  });

  resizeObserver.observe(el);

  initShading();
  lastWidth = window.innerWidth;
  window.addEventListener('resize', resizeHandler);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', resizeHandler);

  if (animation) {
    animation.kill();
  }
});

defineExpose({ stickyInnerRef });
</script>

<style scoped lang="scss">
@import 'index.scss';
</style>
