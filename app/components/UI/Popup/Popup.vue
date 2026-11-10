<template>
  <Transition name="fade">
    <div v-if="isVisible && overlay" :class="['popup-overlay', overlayStyle]" @click="clickClose"></div>
  </Transition>
  <Transition :name="props.nameTransition">
    <div v-if="isVisible" ref="popupRef" :class="['popup', `popup--${containerStyle}`]" role="dialog" aria-modal="true">
      <div class="wrapper popup__content">
        <VButton class="popup__close" :variant="['circle']" @click="clickClose"><SvgIcon name="close" /></VButton>
        <div>
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
// import VButton from '@/components/UI/VButton/VButton.vue';
import { usePopupStore } from '@/stores/popupStore';
import { defineProps, onUnmounted, watch, ref } from 'vue';
import VButton from '../VButton/VButton.vue';

const popupRef = ref(null);
const { closePopup } = usePopupStore();

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true,
  },
  overlay: {
    type: Boolean,
    default: true,
  },
  closeHandler: {
    type: Function,
    default: () => {},
  },
  containerStyle: {
    type: String,
    default: 'base', // base | fullscreen
  },
  nameTransition: {
    type: String,
    default: 'popup-up',
  },
  overlayStyle: {
    type: String,
    default: '',
  },
  backgroundCorner: {
    type: Boolean,
    default: false,
  },
});

const handleFocusTrap = (e) => {
  if (!props.isVisible || e.key !== 'Tab') return;

  const popup = popupRef.value;
  if (!popup) return;

  const focusable = Array.from(
    popup.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'),
  ).filter((el) => !el.hasAttribute('disabled'));

  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
};

// Функция для обработки нажатия клавиш
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    closePopup(); // Закрываем попап при нажатии Esc
  }
};

const clickClose = () => {
  props.closeHandler();
  closePopup();
};

watch(
  () => props.isVisible,
  (isVisible) => {
    if (isVisible) {
      document.body.classList.add('is-lock-scroll');
      window.addEventListener('keydown', handleKeydown);
      window.addEventListener('keydown', handleFocusTrap);

      nextTick(() => {
        const popup = popupRef.value;
        if (popup) {
          const focusable = popup.querySelector(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
          );
          focusable?.focus();
        }
      });
    } else {
      document.body.classList.remove('is-lock-scroll');
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keydown', handleFocusTrap);
    }
  },
);
onUnmounted(() => {
  document.body.classList.remove('is-lock-scroll');
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keydown', handleFocusTrap);
});
</script>

<style scoped>
@import 'index.scss';
</style>
