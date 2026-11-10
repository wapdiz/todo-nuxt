<template>
  <div class="vueuse-examples">
    <h2>Примеры VueUse</h2>

    <section>
      <h3>useToggle - переключатель</h3>
      <button @click="toggle()">
        {{ isOpen ? 'Закрыть' : 'Открыть' }}
      </button>
      <p v-if="isOpen">Контент виден!</p>
    </section>

    <section>
      <h3>useClipboard - копирование в буфер</h3>
      <button @click="handleCopy">Скопировать текст</button>
      <p v-if="copied">Скопировано!</p>
    </section>

    <section>
      <h3>useMediaQuery - медиа-запросы</h3>
      <p>Мобильная версия: {{ isMobile ? 'Да' : 'Нет' }}</p>
      <p>Темная тема: {{ isDark ? 'Да' : 'Нет' }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, type Ref } from 'vue';

// import { useToggle, useClipboard, useMediaQuery } from '@vueuse/core';
// const [isOpen, toggle] = useToggle(false);
// const { copy, copied } = useClipboard();
// const isMobile = useMediaQuery('(max-width: 768px)');
// const isDark = useMediaQuery('(prefers-color-scheme: dark)');

const isOpen: Ref<boolean> = ref(false);
const toggle = (): void => {
  isOpen.value = !isOpen.value;
};
const handleCopy = (): void => {
  copied.value = true;
};
const copied: Ref<boolean> = ref(false);
const isMobile: Ref<boolean> = ref(false);
const isDark: Ref<boolean> = ref(false);
</script>

<style scoped lang="scss">
.vueuse-examples {
  padding: vc(20);
}

section {
  margin-bottom: vc(30);
  border: vc(1) solid $color-base-pressed;
  border-radius: vc(8);
  padding: vc(15);
}

button {
  border: none;
  border-radius: vc(4);
  padding: vc(10) vc(20);
  color: $color-gray-0;
  background: $color-base-pressed;
  cursor: pointer;
}

button:hover {
  background: $color-base-pressed;
}
</style>
