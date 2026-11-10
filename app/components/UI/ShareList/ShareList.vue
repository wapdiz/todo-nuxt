<template>
  <ul class="share-list">
    <li v-if="props.showCopy" class="share-list__item" role="listitem">
      <CopyUrl @click="handleButtonClick('copy')" />
    </li>
    <li v-for="name in props.names" :key="name" class="share-list__item">
      <SocialButton :name="name" @click="handleButtonClick" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import SocialButton from '../SocialButton/SocialButton.vue';
import CopyUrl from '~/components/CopyUrl/CopyUrl.vue';

const props = withDefaults(
  defineProps<{
    names?: string[];
    showCopy?: boolean;
  }>(),
  {
    names: () => ['vk'],
    showCopy: false,
  },
);

const emit = defineEmits<{
  (e: 'click', name: string): void;
}>();

const handleButtonClick = (name: string) => {
  emit('click', name);
};
</script>

<style scoped>
@import 'index.scss';
</style>
