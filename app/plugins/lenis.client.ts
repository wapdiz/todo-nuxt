import type Lenis from 'lenis';

export default defineNuxtPlugin<{ lenis: Lenis | null }>(() => ({
  provide: {
    lenis: null,
  },
}));
