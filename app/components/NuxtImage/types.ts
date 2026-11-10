import type { HTMLAttributes } from 'vue';

export interface ResolvedImageSet {
  original: string;
  avif?: string;
  webp?: string;
}

export interface OptimizeResponse {
  desktop: ResolvedImageSet;
  mobile?: ResolvedImageSet;
  optimized: boolean;
}

export interface picturePaths {
  assetsPublicRoot: string;
  optimizedPublicRoot: string;
}

export interface NuxtImageProps {
  src: string;
  alt?: string;
  mime?: string;
  decoding?: 'async' | 'auto' | 'sync';
  loading?: 'eager' | 'lazy';
  width?: string | number | undefined;
  height?: string | number | undefined;
  retina?: boolean;
  webp?: boolean;
  avif?: boolean;
  mobile?: boolean;
  optimize?: boolean;
  optimizeOriginal?: boolean;
  onlyDesktop?: boolean;
  onlyMobile?: boolean;
  attributes?: HTMLAttributes;
  baseDir?: string;
  fetchpriority?: 'auto' | 'high' | 'low';
}

export interface SourceDescriptor {
  key: string;
  srcset: string;
  type?: string;
  media?: string;
}
