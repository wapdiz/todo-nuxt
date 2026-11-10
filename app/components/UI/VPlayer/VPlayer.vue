<template>
  <div class="v-player" :class="{ 'v-player--loading': isLoading, 'v-player--ready': isReady }">
    <video
      ref="videoElementRef"
      class="v-player__video"
      :poster="props.poster"
      :preload="props.preload"
      :playsinline="props.playsinline"
      :autoplay="autoplayValue"
      :muted="props.muted"
      :loop="props.loop"
      :controls="props.controls"
      :style="videoStyle"
    >
      <p class="v-player__no-js">
        Для просмотра этого видео включите JavaScript и рассмотрите возможность обновления до веб-браузера, который
        <a href="https://videojs.com/html5-video-support/" target="_blank">поддерживает HTML5 видео</a>.
      </p>
    </video>

    <div v-if="isLoading" class="v-player__loader">
      <div class="v-player__spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed, type PropType } from 'vue';
import { usePlayer } from '@/composables/usePlayer';
import type { UsePlayerOptions } from './Player.type';

const props = defineProps({
  src: {
    type: String,
    default: undefined,
  },
  poster: {
    type: String,
    default: undefined,
  },
  autoplay: {
    type: [Boolean, String] as PropType<boolean | 'muted' | 'play' | 'any'>,
    default: false,
  },
  preload: {
    type: String as PropType<'auto' | 'metadata' | 'none'>,
    default: 'auto',
  },
  muted: {
    type: Boolean,
    default: false,
  },
  loop: {
    type: Boolean,
    default: false,
  },
  controls: {
    type: Boolean,
    default: true,
  },
  playsinline: {
    type: Boolean,
    default: true,
  },
  responsive: {
    type: Boolean,
    default: true,
  },
  height: {
    type: [Number, String],
    default: undefined,
  },
  width: {
    type: [Number, String],
    default: undefined,
  },
  sources: {
    type: Array as PropType<Array<{ src: string; type: string }>>,
    default: undefined,
  },
  analytics: {
    type: Object as PropType<UsePlayerOptions['analytics']>,
    default: undefined,
  },
  hls: {
    type: Object as PropType<UsePlayerOptions['hls']>,
    default: undefined,
  },
});

const videoElementRef = ref<HTMLVideoElement | null>(null);
const computedSrc = computed(() => props.src);
const computedSources = computed(() => props.sources);

const autoplayValue = computed(() => {
  const autoplay = props.autoplay ?? false;
  return autoplay === true || autoplay === 'play' || autoplay === 'any';
});

const videoStyle = computed(() => {
  const style: Record<string, string> = {};
  const responsive = props.responsive ?? true;

  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width;
  }
  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
  }
  if (responsive) {
    style.maxWidth = '100%';
    style.height = 'auto';
  }
  return style;
});

const { initPlayer, isLoading, isReady, playerRef, dispose } = usePlayer({
  poster: props.poster,
  autoplay: props.autoplay,
  preload: props.preload,
  muted: props.muted,
  loop: props.loop,
  controls: props.controls,
  playsinline: props.playsinline,
  responsive: props.responsive,
  height: props.height,
  width: props.width,
  analytics: props.analytics,
  hls: props.hls,
  playerId: `vplayer-${Date.now()}`,
});

onMounted(async () => {
  await nextTick();

  if (!videoElementRef.value) return;

  const src = computedSrc.value;
  const sources = computedSources.value;

  if (src || sources) {
    await initPlayer(videoElementRef.value, { src, sources });
  }
});

onBeforeUnmount(() => {
  dispose();
});

defineExpose({
  player: playerRef,
  play: () => playerRef.value?.play(),
  pause: () => playerRef.value?.pause(),
  togglePlay: async () => {
    if (playerRef.value) {
      if (playerRef.value.paused) {
        await playerRef.value.play();
      } else {
        playerRef.value.pause();
      }
    }
  },
  setCurrentTime: (time: number) => {
    if (playerRef.value) {
      playerRef.value.currentTime = time;
    }
  },
  getCurrentTime: () => playerRef.value?.currentTime || 0,
  getDuration: () => playerRef.value?.duration || 0,
  setVolume: (volume: number) => {
    if (playerRef.value) {
      playerRef.value.volume = Math.max(0, Math.min(1, volume));
    }
  },
  getVolume: () => playerRef.value?.volume || 0,
  setMuted: (muted: boolean) => {
    if (playerRef.value) {
      playerRef.value.muted = muted;
    }
  },
  isMuted: () => playerRef.value?.muted || false,
  toggleFullscreen: () => {
    if (!playerRef.value) return;

    if (document.fullscreenElement === playerRef.value) {
      document.exitFullscreen();
    } else if (playerRef.value.requestFullscreen) {
      playerRef.value.requestFullscreen();
    } else if ((playerRef.value as any).webkitRequestFullscreen) {
      (playerRef.value as any).webkitRequestFullscreen();
    } else if ((playerRef.value as any).mozRequestFullScreen) {
      (playerRef.value as any).mozRequestFullScreen();
    } else if ((playerRef.value as any).msRequestFullscreen) {
      (playerRef.value as any).msRequestFullscreen();
    }
  },
});
</script>

<style>
@import './index.scss';
</style>
