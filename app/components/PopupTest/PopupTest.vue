<template>
  <Popup
    container-style="test"
    :is-visible="state.popups.test"
    :close-handler="
      () => {
        // console.log('close');
      }
    "
  >
    <h5 class="popup__title h2">Popup</h5>
    <p class="popup__text">
      Повседневная практика показывает, что сложившаяся структура организации позволяет оценить значение системы
      обучения кадров, соответствует насущным потребностям.
    </p>
  </Popup>
</template>
<script setup>
import Popup from '@/components/UI/Popup/Popup.vue';
import { usePopupStore } from '~/stores/popupStore';
import { usePreloaderStore } from '~/stores/preloaderStore';

const preloaderStore = usePreloaderStore();
const { openPopup } = usePopupStore();

watch(
  () => preloaderStore.state.isVisible,
  (isVisible) => {
    if (!isVisible) {
      setTimeout(() => {
        openPopup('test');
      }, 1000);
    }
  },
);

const { state } = usePopupStore();
</script>
