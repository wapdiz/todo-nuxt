<template>
  <VButton class="go-to-top" @click="goToTop">Вернуться наверх</VButton>
</template>

<script setup>
import VButton from '@/components/UI/VButton/VButton.vue';

const goToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};
</script>

<style scoped lang="scss">
@import './index.scss';
</style>
