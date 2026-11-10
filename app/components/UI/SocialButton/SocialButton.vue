<template>
  <button
    :class="['social-btn', `social-btn--${props.name}`]"
    type="button"
    :aria-label="`Поделиться в ${getSocialName(props.name)}`"
    @click="clickHandler"
  >
    <SvgIcon class="social-btn__icon" :name="props.name" />
  </button>
</template>

<script setup lang="ts">
import { useSocialNames } from '~/composables/useSocialNames';

const { getSocialName } = useSocialNames();

const shareUrls: Record<string, (url: string) => string> = {
  vk: (url) => `https://vk.com/share.php?url=${encodeURIComponent(url)}`,
  ok: (url) => `https://connect.ok.ru/offer?url=${encodeURIComponent(url)}`,
  tg: (url) => `https://t.me/share/url?url=${encodeURIComponent(url)}`,
};

const props = defineProps({
  name: {
    type: String,
    default: 'vk',
  },
});

const emit = defineEmits(['click']);

const clickHandler = () => {
  const createShareUrl = shareUrls[props.name];
  if (!createShareUrl) return;

  const url = location.origin + location.pathname;
  window.open(createShareUrl(url), '_blank', 'noopener,noreferrer');
  emit('click', props.name);
};
</script>

<style scoped>
@import 'index.scss';
</style>
