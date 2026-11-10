// stores/popupStore.js
import { defineStore } from 'pinia';
import { reactive } from 'vue';
import gsap from 'gsap';

export const usePreloaderStore = defineStore('preloader', () => {
  const state = reactive({
    isVisible: true,
    allItems: 4, // загрузка 4х сцен
    currentItems: 0,
    progress: 0,
  });

  const update = () => {
    if (!state.isVisible) return;

    state.currentItems++;
    const lastCurrent = state.currentItems;

    gsap.to(state, {
      duration: 2,
      progress: (state.currentItems / state.allItems) * 100,

      onComplete: () => {
        if (lastCurrent === state.allItems) {
          setTimeout(() => {
            console.log('test');

            state.isVisible = false;
          }, 1000);
        }
      },
    });
  };

  const setAllItems = (count: number) => {
    state.allItems = count;
    state.currentItems = 0;
    state.progress = 0;
  };

  return { state, update, setAllItems };
});
