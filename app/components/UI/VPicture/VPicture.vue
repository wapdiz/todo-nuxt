<template>
  <picture :style="attributes?.style">
    <!-- Mobile version with different images -->
    <template v-if="mobile">
      <source v-if="webp" :srcset="srcMobileWebp" type="image/webp" :media="deviceMedia" />
      <source :srcset="srcMobile" :type="mimeType" :media="deviceMedia" />
      <source v-if="webp" :srcset="srcsetWebp" type="image/webp" />
      <source v-if="retina" :srcset="srcset" :type="mimeType" />
      <img :src="src" :alt="alt" :decoding="decoding" :width="width" :height="height" />
    </template>

    <!-- Only desktop version (empty for mobile) -->
    <template v-else-if="onlyDesktop">
      <source
        :media="deviceMedia"
        srcset="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
      />
      <source v-if="webp" :srcset="srcsetWebp" type="image/webp" />
      <source v-if="retina" :srcset="srcset" />
      <img :src="src" :alt="alt" :decoding="decoding" :width="width" :height="height" />
    </template>

    <!-- Only mobile version (empty for desktop) -->
    <template v-else-if="onlyMobile">
      <source v-if="webp" :srcset="srcsetWebp" type="image/webp" :media="deviceMedia" />
      <source v-if="retina" :srcset="srcset" :type="mimeType" :media="deviceMedia" />
      <source :srcset="src" :type="mimeType" :media="deviceMedia" />
      <img
        src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
        :alt="alt"
        :decoding="decoding"
        :width="width"
        :height="height"
      />
    </template>

    <!-- Default version -->
    <template v-else>
      <source v-if="webp" :srcset="srcsetWebp" type="image/webp" />
      <source v-if="retina" :srcset="srcset" />
      <img :src="src" :alt="alt" :decoding="decoding" :width="width" :height="height" />
    </template>
  </picture>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

interface Props {
  path: string;
  ext: string;
  alt?: string;
  mime?: string;
  decoding?: 'async' | 'auto' | 'sync';
  width?: string | number | undefined;
  height?: string | number | undefined;
  retina?: boolean;
  webp?: boolean;
  mobile?: boolean;
  onlyDesktop?: boolean;
  onlyMobile?: boolean;
  attributes?: HTMLAttributes;
  baseDir?: string;
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  mime: undefined,
  decoding: 'async',
  width: undefined,
  height: undefined,
  retina: false,
  webp: false,
  mobile: false,
  onlyDesktop: false,
  onlyMobile: false,
  attributes: () => ({}),
  baseDir: '',
});

const baseDir = props.baseDir || helpers.getBaseDir();

const mimeType = computed(() => {
  if (props.mime) return props.mime;

  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };

  return mimeMap[props.ext.toLowerCase()] || 'image/jpeg';
});

const src = computed(() => baseDir + `${props.path}.${props.ext}`);

const srcset = computed(
  () =>
    baseDir +
    (props.retina ? `${props.path}.${props.ext}, ${props.path}@2x.${props.ext} 2x` : `${props.path}.${props.ext}`),
);

const srcsetWebp = computed(
  () => baseDir + (props.retina ? `${props.path}.webp, ${props.path}@2x.webp 2x` : `${props.path}.webp`),
);

const srcMobile = computed(() => {
  if (!props.mobile) return undefined;
  return (
    baseDir +
    (props.retina
      ? `${props.path}-mobile.${props.ext}, ${props.path}-mobile@2x.${props.ext} 2x`
      : `${props.path}-mobile.${props.ext}`)
  );
});

const srcMobileWebp = computed(() => {
  if (!props.mobile) return undefined;
  return (
    baseDir +
    (props.retina ? `${props.path}-mobile.webp, ${props.path}-mobile@2x.webp 2x` : `${props.path}-mobile.webp`)
  );
});
</script>
