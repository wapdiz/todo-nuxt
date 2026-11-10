import type { Ref } from 'vue';

export interface UseWindowSizeReturn {
  width: Readonly<Ref<number>>;
  height: Readonly<Ref<number>>;
}

export function useWindowSizeExample() {
  // import { useWindowSize } from '@vueuse/core';
  //
  // const { width, height } = useWindowSize();
  // const result: UseWindowSizeReturn = { width, height };
  //
  // return result;
}

export interface UseLocalStorageReturn<T> {
  storedValue: Ref<T>;
}

export function useLocalStorageExample() {
  // import { useLocalStorage } from '@vueuse/core';
  //
  // const storedValue = useLocalStorage<string>('my-key', 'default-value');
  // const result: UseLocalStorageReturn<string> = { storedValue };
  //
  // storedValue.value = 'new value';
  //
  // return result;
}

export interface UseDebounceReturn<T> {
  searchQuery: Ref<T>;
  debouncedQuery: Ref<T>;
}

export function useDebounceExample() {
  // import { useDebounce } from '@vueuse/core';
  // import { ref, watch } from 'vue';
  //
  // const searchQuery = ref<string>('');
  // const debouncedQuery = useDebounce(searchQuery, 500);
  // const result: UseDebounceReturn<string> = { searchQuery, debouncedQuery };
  //
  // watch(debouncedQuery, (value: string) => {
  //   console.log('Поиск:', value);
  // });
  //
  // return result;
}

export interface UseMouseReturn {
  x: Readonly<Ref<number>>;
  y: Readonly<Ref<number>>;
}

export function useMouseExample() {
  // import { useMouse } from '@vueuse/core';
  //
  // const { x, y } = useMouse();
  // const result: UseMouseReturn = { x, y };
  //
  // return result;
}

export interface UseScrollReturn {
  elementRef: Ref<HTMLElement | undefined>;
  x: Ref<number>;
  y: Ref<number>;
  isScrolling: Readonly<Ref<boolean>>;
  arrivedState: {
    top: Readonly<Ref<boolean>>;
    bottom: Readonly<Ref<boolean>>;
  };
}

export function useScrollExample() {
  // import { useScroll } from '@vueuse/core';
  // import { ref } from 'vue';
  //
  // const elementRef = ref<HTMLElement>();
  // const { x, y, isScrolling, arrivedState } = useScroll(elementRef);
  // const result: UseScrollReturn = { elementRef, x, y, isScrolling, arrivedState };
  //
  // return result;
}

export interface UseToggleReturn {
  isOpen: Ref<boolean>;
  toggle: (value?: boolean) => void;
}

export function useToggleExample() {
  // import { useToggle } from '@vueuse/core';
  //
  // const [isOpen, toggle] = useToggle(false);
  // const result: UseToggleReturn = { isOpen, toggle };
  //
  // return result;
}

export interface UseClipboardReturn {
  copy: (text: string) => Promise<void>;
  copied: Readonly<Ref<boolean>>;
  text: Readonly<Ref<string>>;
}

export function useClipboardExample() {
  // import { useClipboard } from '@vueuse/core';
  //
  // const { copy, copied, text } = useClipboard();
  // const result: UseClipboardReturn = { copy, copied, text };
  //
  // return result;
}

export interface UseMediaQueryReturn {
  isMobile: Readonly<Ref<boolean>>;
  isDark: Readonly<Ref<boolean>>;
}

export function useMediaQueryExample() {
  // import { useMediaQuery } from '@vueuse/core';
  //
  // const isMobile = useMediaQuery('(max-width: 768px)');
  // const isDark = useMediaQuery('(prefers-color-scheme: dark)');
  // const result: UseMediaQueryReturn = { isMobile, isDark };
  //
  // return result;
}
