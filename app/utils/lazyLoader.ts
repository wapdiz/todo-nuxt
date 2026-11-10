import type { Component } from 'vue';
import { defineAsyncComponent } from 'vue';

interface LazyLoadOptions {
  loadingComponent?: Component | undefined;
  errorComponent?: Component | undefined;
  delay?: number;
  timeout?: number;
  suspensible?: boolean;
  onError?: (error: Error) => void;
}

export function lazyLoad(loader: () => Promise<Component>, options: LazyLoadOptions = {}): Component {
  const {
    loadingComponent = undefined,
    errorComponent = undefined,
    delay = 200,
    timeout = 30000,
    suspensible = true,
    onError = undefined,
  } = options;

  return defineAsyncComponent({
    loader,
    loadingComponent,
    errorComponent,
    delay,
    timeout,
    suspensible,
    onError,
  });
}

interface LazyLoadImageOptions {
  width?: number | null;
  height?: number | null;
  alt?: string;
  className?: string;
  onLoad?: (img: HTMLImageElement) => void;
  onError?: (error: string | Event) => void;
}

export function lazyLoadImage(src: string, options: LazyLoadImageOptions = {}): Promise<HTMLImageElement> {
  const { width = null, height = null, alt = '', className = '', onLoad = null, onError = null } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();

    if (width) img.width = width;
    if (height) img.height = height;
    img.alt = alt;
    if (className) img.className = className;

    img.onload = () => {
      if (onLoad) onLoad(img);
      resolve(img);
    };

    img.onerror = (error) => {
      if (onError) onError(error);
      reject(error);
    };

    img.src = src;
  });
}

interface LazyLoadComponentsOptions extends LazyLoadOptions {}

export function lazyLoadComponents(
  components: Record<string, () => Promise<Component>>,
  options: LazyLoadComponentsOptions = {},
): Record<string, Component> {
  const result: Record<string, Component> = {};

  for (const [name, loader] of Object.entries(components)) {
    result[name] = lazyLoad(loader, options);
  }

  return result;
}

interface VisibleLoadOptions extends LazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
}

export function visibleLoad(loader: () => Promise<Component>, options: VisibleLoadOptions = {}): Component {
  const { rootMargin = '0px', threshold = 0, ...asyncOptions } = options;

  const asyncComponent: Component = lazyLoad(loader, asyncOptions);

  return {
    name: 'VisibleLoadWrapper',
    data() {
      return {
        isVisible: false,
        observer: null as IntersectionObserver | null,
      };
    },
    mounted() {
      this.setupObserver();
    },
    beforeUnmount() {
      this.destroyObserver();
    },
    methods: {
      setupObserver() {
        this.observer = new IntersectionObserver(
          (entries) => {
            const [entry] = entries as IntersectionObserverEntry[];
            if (entry && entry.isIntersecting) {
              this.isVisible = true;
              this.destroyObserver();
            }
          },
          { rootMargin, threshold },
        );

        if (this.$el) {
          this.observer.observe(this.$el);
        }
      },
      destroyObserver() {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
      },
    },
    render() {
      return this.isVisible
        ? h(asyncComponent, this.$attrs)
        : h('div', {
            class: 'lazy-placeholder',
            style: {
              width: '100%',
              height: '100px',
              background: '#f5f5f5',
            },
          });
    },
  };
}

export default {
  lazyLoad,
  lazyLoadImage,
  lazyLoadComponents,
  visibleLoad,
};
