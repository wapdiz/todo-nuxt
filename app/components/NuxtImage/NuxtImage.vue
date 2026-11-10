<template>
  <picture :style="attributes?.style">
    <source
      v-for="source in sources"
      :key="source.key"
      :srcset="baseDir + source.srcset"
      :type="source.type"
      :media="source.media"
    />

    <img
      :src="baseDir + imageSrc"
      :alt="alt"
      :decoding="decoding"
      :loading="loading"
      :width="width"
      :height="height"
      :fetchpriority="fetchpriority"
    />
  </picture>
</template>

<script setup lang="ts">
import { useNuxtImage } from './useNuxtImage';
import type { NuxtImageProps } from './types';

const props = withDefaults(defineProps<NuxtImageProps>(), {
  alt: '',
  mime: undefined,
  decoding: 'async',
  loading: 'lazy',
  width: undefined,
  height: undefined,
  retina: false,
  webp: false,
  avif: false,
  mobile: false,
  optimize: true,
  optimizeOriginal: true,
  onlyDesktop: false,
  onlyMobile: false,
  attributes: () => ({}),
  baseDir: '',
  fetchpriority: undefined,
});

const { imageSrc, sources } = await useNuxtImage(props);
const baseDir = props.baseDir || helpers.getBaseDir();
</script>
