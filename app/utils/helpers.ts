// helpers.ts
import { disableBodyScroll, enableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock';

export const isDev = () => process.env.NODE_ENV === 'development';

interface IHelpers {
  $html: HTMLHtmlElement | null;
  isSafari: () => boolean;
  clearText: (text: string) => string;

  lockScroll: (state: boolean, element: Element | { $el?: Element } | null, name?: string) => void;
  createFixedPanel: () => void;
  cleanArticleUrl: (url: string) => string;
  scrollSet: (state: boolean) => void;
  filterPath: (path: string) => string;
  getBaseDir: () => string;
}

const scrollLocks = new Set<string>();

const helpers: IHelpers = {
  $html: document && document.querySelector('html'),
  isSafari: () =>
    document.documentElement.classList.contains('is-browser-safari') ||
    document.documentElement.classList.contains('is-browser-mobile-safari'),
  clearText: (text: string) => text.trim().replace(/\s+/g, ' '),

  getBaseDir: () => useRuntimeConfig().app.baseURL.slice(0, -1),

  lockScroll: (state: boolean, element: Element | { $el?: Element } | null, name?: string) => {
    const targetElement = (element as any)?.nodeType ? element : (element as any)?.$el || element;

    if (!targetElement) {
      console.warn('lockScroll: No valid element provided');
      return;
    }

    if (state) {
      if (typeof name === 'string') {
        scrollLocks.add(name);
      }

      disableBodyScroll(targetElement, { reserveScrollBarGap: true });

      setTimeout(() => {
        helpers.$html?.classList.add('is-lock-scroll');
      }, 0);
    } else {
      if (typeof name === 'string') {
        scrollLocks.delete(name);
      }

      enableBodyScroll(targetElement);

      if (!scrollLocks.size) {
        clearAllBodyScrollLocks();
        helpers.$html?.classList.remove('is-lock-scroll');
      }
    }
  },

  scrollSet: (state) => {
    if (state) {
      helpers.$html?.classList.add('is-lock-scroll');
    } else {
      helpers.$html?.classList.remove('is-lock-scroll');
    }
  },

  createFixedPanel: () => {
    if (document.getElementById('fixed-panel')) return;

    const div = document.createElement('div');
    div.id = 'fixed-panel';
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.right = '0';
    div.style.display = 'block';
    div.style.width = '100vw';
    div.style.height = '48px';

    div.innerHTML = `<div style="position: absolute; background-color: #fdfdf1; height: 100vh"></div>`;
    document.documentElement.appendChild(div);
  },

  cleanArticleUrl: (url: string) => {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return url;
    }
  },

  filterPath: (string: string): string => {
    if (string.indexOf('index.') >= 0) {
      string = string.substring(0, string.lastIndexOf('/'));
    }

    if (string.endsWith('/')) {
      string = string.slice(0, -1);
    }

    return string;
  },
};

export default helpers;
