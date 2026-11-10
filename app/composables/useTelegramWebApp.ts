import InAppSpy from 'inapp-spy';
import type { TelegramWebApp } from '@/types/telegram';

export const useTelegramWebApp = () => {
  const isInApp = ref(false);
  const webApp = ref<TelegramWebApp | null>(null);

  const initialize = () => {
    if (typeof window === 'undefined') return;

    const { isInApp: detectedInApp } = InAppSpy();
    isInApp.value = detectedInApp;

    if (isInApp.value && window.Telegram?.WebApp) {
      webApp.value = window.Telegram.WebApp;
      webApp.value.ready();
    }
  };

  const openUrl = (url: string, options?: { try_instant_view?: boolean }) => {
    if (!webApp.value || !isInApp.value) {
      window.open(url, '_blank');
      return;
    }

    webApp.value.openLink(url, options);
  };

  const showAlert = (message: string) => {
    if (!webApp.value) return Promise.resolve();

    return new Promise<void>((resolve) => {
      webApp.value?.showAlert(message, () => resolve());
    });
  };

  const showConfirm = (message: string) => {
    if (!webApp.value) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      webApp.value?.showConfirm(message, (confirmed) => resolve(confirmed));
    });
  };

  const close = () => {
    webApp.value?.close();
  };

  const expand = () => {
    webApp.value?.expand();
  };

  onMounted(() => {
    initialize();
  });

  return {
    isInApp: readonly(isInApp),
    webApp: readonly(webApp),
    openUrl,
    showAlert,
    showConfirm,
    close,
    expand,
  };
};
