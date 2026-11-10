<template>
  <div
    ref="containerRef"
    class="ai-orb"
    aria-hidden="true"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <canvas ref="canvasRef" class="ai-orb__canvas" :class="{ 'ai-orb__canvas--visible': orbVisible }"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { initOrbWebgl, type OrbWebglController } from '~/utils/aiOrbShader';

const props = withDefaults(
  defineProps<{
    hue?: number;
    hoverIntensity?: number;
    rotateOnHover?: boolean;
    forceHoverState?: boolean;
  }>(),
  {
    hue: 0,
    hoverIntensity: 0.45,
    rotateOnHover: true,
    forceHoverState: false,
  },
);

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const orbVisible = ref(false);

let controller: OrbWebglController | null = null;
let resizeObserver: ResizeObserver | null = null;
let reducedMotionMedia: MediaQueryList | null = null;
let rafId: number | null = null;

let boxWidth = 0;
let boxHeight = 0;
let targetHover = 0;
let currentHover = 0;
let currentRot = 0;
let targetMouseX = 0;
let targetMouseY = 0;
let currentMouseX = 0;
let currentMouseY = 0;
let elapsedTime = 0;
let lastFrameMs = 0;
let prefersReducedMotion = false;

function handlePointerMove(event: PointerEvent) {
  const el = containerRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const size = Math.min(rect.width, rect.height);
  const uvX = ((event.clientX - rect.left - rect.width * 0.5) / size) * 2;
  const uvY = -(((event.clientY - rect.top - rect.height * 0.5) / size) * 2);

  targetMouseX = Math.max(-1, Math.min(1, uvX));
  targetMouseY = Math.max(-1, Math.min(1, uvY));
  targetHover = Math.hypot(uvX, uvY) < 0.95 ? 1 : 0;
}

function handlePointerLeave() {
  targetHover = 0;
  targetMouseX = 0;
  targetMouseY = 0;
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function drawCurrentFrame(timeSec: number) {
  if (!controller || boxWidth <= 0 || boxHeight <= 0) return;
  controller.render({
    time: timeSec,
    width: boxWidth,
    height: boxHeight,
    hue: props.hue,
    hover: currentHover,
    rot: currentRot,
    hoverIntensity: props.hoverIntensity,
    mouseX: currentMouseX,
    mouseY: currentMouseY,
  });
}

function tick(nowMs: number) {
  rafId = null;
  if (!controller || boxWidth <= 0 || boxHeight <= 0 || prefersReducedMotion || document.hidden) return;

  const dt = lastFrameMs > 0 ? Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) * 0.001)) : 0.016;
  lastFrameMs = nowMs;

  const effectiveHover = props.forceHoverState ? 1 : targetHover;
  currentHover += (effectiveHover - currentHover) * 0.1;
  currentMouseX += (targetMouseX - currentMouseX) * 0.12;
  currentMouseY += (targetMouseY - currentMouseY) * 0.12;

  const speedMultiplier = 1 + currentHover * 0.55;
  elapsedTime += dt * speedMultiplier;

  if (props.rotateOnHover) {
    currentRot += dt * (0.1 + currentHover * 0.35);
  }

  drawCurrentFrame(elapsedTime);
  if (!orbVisible.value) {
    orbVisible.value = true;
  }
  rafId = requestAnimationFrame(tick);
}

function syncPlayback() {
  if (!controller || boxWidth <= 0 || boxHeight <= 0) {
    stopLoop();
    orbVisible.value = false;
    return;
  }

  if (prefersReducedMotion) {
    stopLoop();
    currentHover = props.forceHoverState ? 0.5 : 0;
    drawCurrentFrame(0.8);
    orbVisible.value = true;
    return;
  }

  if (document.hidden) {
    stopLoop();
    return;
  }

  if (rafId === null) {
    lastFrameMs = performance.now();
    rafId = requestAnimationFrame(tick);
  }
}

function updateSize(width: number, height: number) {
  boxWidth = Math.max(0, Math.round(width));
  boxHeight = Math.max(0, Math.round(height));
  if (controller && boxWidth > 0 && boxHeight > 0) {
    controller.resize(boxWidth, boxHeight, window.devicePixelRatio || 1);
  }
  syncPlayback();
}

function handleVisibilityChange() {
  syncPlayback();
}

function handleMotionChange(event: MediaQueryListEvent) {
  prefersReducedMotion = event.matches;
  syncPlayback();
}

function handleContextLost(event: Event) {
  event.preventDefault();
  stopLoop();
  orbVisible.value = false;
}

onMounted(() => {
  const container = containerRef.value;
  const canvas = canvasRef.value;
  if (!container || !canvas) return;

  reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  prefersReducedMotion = reducedMotionMedia.matches;
  reducedMotionMedia.addEventListener('change', handleMotionChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  canvas.addEventListener('webglcontextlost', handleContextLost);

  controller = initOrbWebgl(canvas);
  if (!controller) {
    orbVisible.value = false;
    return;
  }

  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    updateSize(entry.contentRect.width, entry.contentRect.height);
  });
  resizeObserver.observe(container);
  updateSize(container.clientWidth, container.clientHeight);
});

watch(
  () => [props.hue, props.hoverIntensity, props.rotateOnHover, props.forceHoverState],
  () => {
    if (prefersReducedMotion) {
      currentHover = props.forceHoverState ? 0.5 : 0;
      drawCurrentFrame(0.8);
    }
  },
);

onBeforeUnmount(() => {
  stopLoop();
  resizeObserver?.disconnect();
  resizeObserver = null;
  reducedMotionMedia?.removeEventListener('change', handleMotionChange);
  reducedMotionMedia = null;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  canvasRef.value?.removeEventListener('webglcontextlost', handleContextLost);
  controller?.dispose();
  controller = null;
});
</script>

<style lang="scss" scoped src="./style.scss"></style>
