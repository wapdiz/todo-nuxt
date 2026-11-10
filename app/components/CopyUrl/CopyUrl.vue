<template>
  <button
    data-social="copy_url"
    type="button"
    class="copy"
    tabindex="0"
    aria-label="Скопировать ссылку"
    @click="handleClick"
  >
    <svg-icon name="copy" />
    <Transition name="fade">
      <div v-show="tipIsVisible" :class="{ 'is-animate': tipIsVisible }" class="tip">
        <div class="tip__icon">
          <svg-icon name="copy" />
        </div>
        <div class="tip__text">Ссылка скопирована</div>
      </div>
    </Transition>
  </button>
</template>

<script setup>
import { ref } from 'vue';
import { copyUrl } from '@/utils/copyUrl';

const tipIsVisible = ref(false);
const tipIsAnimating = ref(false);

const showTip = () => {
  if (tipIsAnimating.value) return;

  tipIsVisible.value = true;
  tipIsAnimating.value = true;

  setTimeout(() => {
    tipIsVisible.value = false;
    tipIsAnimating.value = false;
  }, 3000);
};

const emit = defineEmits(['click']);

const handleClick = () => {
  copyUrl();
  showTip();
  emit('click', 'copy');
};
</script>

<style scoped>
@import './index.scss';
</style>
