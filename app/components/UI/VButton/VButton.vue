<template>
  <component
    :is="as"
    class="v-btn"
    :href="href"
    :class="classes"
    :type="as === 'button' ? 'button' : null"
    v-bind="$attrs"
    @click="handlePress"
  >
    <slot></slot>
    <SvgIcon v-if="icon" :name="icon" />
  </component>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  as: { type: String, default: 'button' },
  href: { type: String },
  variant: { type: Array, default: () => [] },
  icon: { type: String },
});

defineOptions({
  name: 'VButton',
});
// const attrs = useAttrs();

const isPressed = ref(false);
let pressTimeout = null;

const handlePress = () => {
  // Сбрасываем предыдущий таймер, если он есть
  if (pressTimeout) {
    clearTimeout(pressTimeout);
    pressTimeout = null;
  }

  // Устанавливаем состояние нажатия
  isPressed.value = true;

  // Через 200мс снимаем состояние нажатия
  pressTimeout = setTimeout(() => {
    isPressed.value = false;
    pressTimeout = null;
  }, 200);
};

const classes = computed(() => {
  return [...props.variant.map((el) => `v-btn--${el}`), isPressed.value && 'v-btn--pressed'];
});
</script>

<style>
@import './index.scss';
</style>
