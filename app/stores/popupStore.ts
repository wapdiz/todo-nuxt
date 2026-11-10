// stores/popupStore.ts
import { defineStore } from 'pinia';
import { reactive } from 'vue';

export type Popups = 'test'; // Добавьте другие попапы через | при необходимости
interface PopupState {
  popups: Record<Popups, boolean>;
  activePopup: Popups | null;
}

const popupName = {
  // story1: 'story1',
  // story3: 'story3',
  // nutritionist: 'nutritionist',
  // personal: 'personal',
  // calorie:'calorie',
  // formula: 'formula',
  // physical: 'physical',
  // notice: 'notice',
  // plate: 'plate',
  // dessert: 'dessert'
} as const;

export const usePopupStore = defineStore('popup', () => {
  const state = reactive<PopupState>({
    popups: {
      test: false,
    },
    activePopup: null,
  });

  const openPopup = (popupName: Popups, dataIndex: number = 0): void => {
    if (state.activePopup) {
      state.popups[state.activePopup] = false;
    }
    console.log(dataIndex);

    state.popups[popupName] = true;
    state.activePopup = popupName;
  };

  const closePopup = (): void => {
    const activePopup = state.activePopup;

    if (activePopup) {
      state.popups[activePopup] = false;
    }
    state.activePopup = null;
  };

  const getActivePopupName = () => {
    return state.activePopup ? popupName[state.activePopup as keyof typeof popupName] : '';
  };

  return {
    state,
    openPopup,
    closePopup,
    getActivePopupName,
  };
});
