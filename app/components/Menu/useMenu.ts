import { defineStore } from 'pinia';
import { ref } from 'vue';

const useMenuStore = defineStore('menuStore', () => {
  const isMenuOpen = ref(false);

  return {
    isMenuOpen,
  };
});

export default useMenuStore;
