import type { Directive } from 'vue';
import InAppSpy from 'inapp-spy';

export default defineNuxtPlugin((nuxtApp) => {
  const tgLinks: Directive<HTMLAnchorElement> = {
    getSSRProps() {
      return {};
    },

    mounted(el) {
      if (typeof window === 'undefined') return;

      const { isInApp } = InAppSpy();

      if (!isInApp) return;

      const handler = (e: Event) => {
        e.preventDefault();

        const url = el.href;

        if (window.Telegram?.WebApp?.openLink) {
          window.Telegram.WebApp.openLink(url);
        } else {
          window.open(url, '_blank');
        }
      };

      (el as any)._tgLinkHandler = handler;
      el.addEventListener('click', handler);
    },

    unmounted(el) {
      const handler = (el as any)._tgLinkHandler;
      if (handler) {
        el.removeEventListener('click', handler);
        delete (el as any)._tgLinkHandler;
      }
    },
  };

  nuxtApp.vueApp.directive('tg-links', tgLinks);
});
