import type { Reactive } from 'vue';
import { ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import type { Popups } from '../stores/popupStore';
import { usePopupStore } from '../stores/popupStore';

const useFormGuard = (popupName: Popups) => {
  const { openPopup } = usePopupStore();
  const isFormDirty = ref(false);
  const leaveConfirmation = ref({});
  let initialFormData: string = '';

  const setIsDirty = (newString: string) => {
    isFormDirty.value = newString !== initialFormData;
  };

  const initFormTracking = (formData: Reactive<{}>): void => {
    // Сохраняем начальное состояние
    initialFormData = JSON.stringify(formData);
    isFormDirty.value = false;

    watch(
      formData,
      () => {
        setIsDirty(JSON.stringify(formData));
      },
      { deep: true },
    );
  };

  const updateInitialFormData = (formData: Reactive<{}>): void => {
    initialFormData = JSON.stringify(formData);

    setIsDirty(JSON.stringify(formData));
  };

  onBeforeRouteLeave((to, from, next) => {
    if (isFormDirty.value) {
      openPopup(popupName);
      new Promise((resolve, reject) => {
        leaveConfirmation.value = {
          resolve,
          reject,
        };
      })
        .then(() => {
          // console.log('resolve');

          next(false);
        })
        .catch(() => {
          // console.log('reject');
          next();
        });
    } else {
      next();
    }
  });

  return { isFormDirty, leaveConfirmation, initFormTracking, updateInitialFormData, setIsDirty };
};

export default useFormGuard;
