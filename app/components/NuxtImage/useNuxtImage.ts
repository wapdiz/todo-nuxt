import { computed } from 'vue';
import { MIME_BY_EXTENSION, TRANSPARENT_GIF_DATA_URI } from './constants';
import type { NuxtImageProps, OptimizeResponse, SourceDescriptor } from './types';
import { PICTURE_PATHS } from '~~/project-config/base';

interface ParsedSource {
  pathWithoutExt: string;
  extension: string;
  normalizedSrc: string;
}

function normalizeSourceInput(src: string): string {
  return src.replace(/\\/g, '/').trim();
}

function parseSource(src: string): ParsedSource {
  const normalizedSrc = normalizeSourceInput(src);
  if (!normalizedSrc) {
    return { pathWithoutExt: '', extension: '', normalizedSrc: '' };
  }

  const withoutQuery = normalizedSrc.split(/[?#]/)[0] || '';
  const match = withoutQuery.match(/^(.*)\.([^./]+)$/);

  if (!match) {
    return {
      pathWithoutExt: withoutQuery,
      extension: '',
      normalizedSrc: withoutQuery,
    };
  }

  return {
    pathWithoutExt: match[1] || '',
    extension: (match[2] || '').toLowerCase(),
    normalizedSrc: withoutQuery,
  };
}

function buildSourceSet(defaultSrc: string, retinaSrc?: string, optimize = true, retina = false): string {
  if (optimize) return defaultSrc;
  if (!retina || !retinaSrc) return defaultSrc;
  return `${defaultSrc}, ${retinaSrc} 2x`;
}

function toMobilePath(desktopPath: string): string {
  return desktopPath.replace(/(\.[^.]+)$/, '-mobile$1');
}

function buildFallbackResponse(
  desktopPath: string,
  mobilePath: string,
  shouldUseMobile: boolean,
  desktopFallbackWebp?: string,
  desktopFallbackAvif?: string,
  mobileFallbackWebp?: string,
  mobileFallbackAvif?: string,
): OptimizeResponse {
  const response: OptimizeResponse = {
    desktop: {
      original: desktopPath,
      avif: desktopFallbackAvif,
      webp: desktopFallbackWebp,
    },
    optimized: false,
  };

  if (shouldUseMobile) {
    response.mobile = {
      original: mobilePath,
      avif: mobileFallbackAvif,
      webp: mobileFallbackWebp,
    };
  }

  return response;
}

function buildFallbackResponseWithOptimized(
  desktopPath: string,
  mobilePath: string,
  shouldUseMobile: boolean,
  desktopFallbackWebp?: string,
  desktopFallbackAvif?: string,
  mobileFallbackWebp?: string,
  mobileFallbackAvif?: string,
): OptimizeResponse {
  const response: OptimizeResponse = {
    desktop: {
      original: desktopPath.replace(PICTURE_PATHS.assetsPublicRoot, PICTURE_PATHS.optimizedPublicRoot),
      avif: desktopFallbackAvif?.replace(PICTURE_PATHS.assetsPublicRoot, PICTURE_PATHS.optimizedPublicRoot),
      webp: desktopFallbackWebp?.replace(PICTURE_PATHS.assetsPublicRoot, PICTURE_PATHS.optimizedPublicRoot),
    },
    optimized: true,
  };

  if (shouldUseMobile) {
    response.mobile = {
      original: mobilePath.replace(PICTURE_PATHS.assetsPublicRoot, PICTURE_PATHS.optimizedPublicRoot),
      avif: mobileFallbackAvif?.replace(PICTURE_PATHS.assetsPublicRoot, PICTURE_PATHS.optimizedPublicRoot),
      webp: mobileFallbackWebp?.replace(PICTURE_PATHS.assetsPublicRoot, PICTURE_PATHS.optimizedPublicRoot),
    };
  }

  return response;
}

function pushSource(
  list: SourceDescriptor[],
  key: string,
  srcset: string | undefined,
  type?: string,
  media?: string,
): void {
  if (!srcset) return;
  list.push({ key, srcset, type, media });
}

export async function useNuxtImage(props: Readonly<NuxtImageProps>) {
  // deviceMedia imported from useMatchMedia

  const nuxtApp = useNuxtApp();
  const parsedSource = computed(() => parseSource(props.src));
  const pathWithoutExt = computed(() => parsedSource.value.pathWithoutExt);
  const extension = computed(() => parsedSource.value.extension);
  const hasValidSource = computed(() => Boolean(pathWithoutExt.value && extension.value));

  const desktopOriginalPath = computed(() =>
    hasValidSource.value ? `${pathWithoutExt.value}.${extension.value}` : parsedSource.value.normalizedSrc,
  );
  const desktopFallbackWebp = computed(() =>
    props.webp && pathWithoutExt.value ? `${pathWithoutExt.value}.webp` : undefined,
  );
  const desktopFallbackAvif = computed(() =>
    props.avif && pathWithoutExt.value ? `${pathWithoutExt.value}.avif` : undefined,
  );
  const mobileOriginalPath = computed(() =>
    hasValidSource.value ? `${pathWithoutExt.value}-mobile.${extension.value}` : '',
  );
  const mobileFallbackWebp = computed(() =>
    props.webp && pathWithoutExt.value ? `${pathWithoutExt.value}-mobile.webp` : undefined,
  );
  const mobileFallbackAvif = computed(() =>
    props.avif && pathWithoutExt.value ? `${pathWithoutExt.value}-mobile.avif` : undefined,
  );

  const mimeType = computed(() => {
    if (props.mime) return props.mime;
    return MIME_BY_EXTENSION[extension.value] || 'image/jpeg';
  });

  const hasConversionFlags = computed(() => props.webp || props.avif);
  const shouldRunOptimization = computed(() => props.optimizeOriginal || hasConversionFlags.value);

  const asyncKey = computed(
    () =>
      `nuxt-image:${parsedSource.value.normalizedSrc}:m${props.mobile ? 1 : 0}:o${props.optimize ? 1 : 0}:oo${props.optimizeOriginal ? 1 : 0}:w${props.webp ? 1 : 0}:a${props.avif ? 1 : 0}`,
  );

  const { data } = await useAsyncData<OptimizeResponse>(
    asyncKey,
    async () => {
      const isDevOrBuilding = import.meta.dev || import.meta.prerender;

      const fallback = buildFallbackResponse(
        desktopOriginalPath.value,
        mobileOriginalPath.value,
        !!props.mobile,
        desktopFallbackWebp.value,
        desktopFallbackAvif.value,
        mobileFallbackWebp.value,
        mobileFallbackAvif.value,
      );

      const optimizedfallback = buildFallbackResponseWithOptimized(
        desktopOriginalPath.value,
        mobileOriginalPath.value,
        !!props.mobile,
        desktopFallbackWebp.value,
        desktopFallbackAvif.value,
        mobileFallbackWebp.value,
        mobileFallbackAvif.value,
      );

      if (!props.optimize || !hasValidSource.value || !shouldRunOptimization.value) return fallback;

      // For client-only routes (ssr: false), force original/fallback sources.
      if (import.meta.client && !nuxtApp.payload.serverRendered) {
        return fallback;
      }

      if (!isDevOrBuilding && nuxtApp.payload.serverRendered) {
        return optimizedfallback;
      }

      try {
        return await $fetch('/api/picture.optimize', {
          method: 'POST',
          body: {
            path: pathWithoutExt.value,
            ext: extension.value,
            mobile: props.mobile,
            optimize: props.optimize,
            optimizeOriginal: props.optimizeOriginal,
            webp: props.webp,
            avif: props.avif,
          },
        });
      } catch (error) {
        console.error('[NuxtImage] fallback to original image', error);
        return fallback;
      }
    },
    {
      server: true,
      default: () =>
        buildFallbackResponse(
          desktopOriginalPath.value,
          mobileOriginalPath.value,
          !!props.mobile,
          desktopFallbackWebp.value,
          desktopFallbackAvif.value,
          mobileFallbackWebp.value,
          mobileFallbackAvif.value,
        ),
    },
  );

  const resolvedDesktop = computed(
    () =>
      data.value?.desktop ??
      buildFallbackResponse(
        desktopOriginalPath.value,
        mobileOriginalPath.value,
        !!props.mobile,
        desktopFallbackWebp.value,
        desktopFallbackAvif.value,
        mobileFallbackWebp.value,
        mobileFallbackAvif.value,
      ).desktop,
  );

  const resolvedMobile = computed(() => {
    if (props.mobile) return data.value?.mobile ?? resolvedDesktop.value;
    return resolvedDesktop.value;
  });

  const desktopAvif = computed(() => (props.avif ? resolvedDesktop.value.avif : undefined));
  const desktopWebp = computed(() =>
    buildSourceSet(
      resolvedDesktop.value.webp ?? '',
      !props.optimize && props.webp && props.retina ? `${pathWithoutExt.value}@2x.webp` : undefined,
      props.optimize,
      Boolean(props.retina),
    ),
  );

  const desktopOriginalImage = computed(() => resolvedDesktop.value.original);

  const mobileAvif = computed(() => (props.avif ? resolvedMobile.value.avif : undefined));
  const mobileWebp = computed(() =>
    buildSourceSet(
      resolvedMobile.value.webp ?? '',
      !props.optimize && props.mobile && props.webp && props.retina
        ? `${pathWithoutExt.value}-mobile@2x.webp`
        : undefined,
      props.optimize,
      Boolean(props.retina),
    ),
  );

  const mobileOriginalSource = computed(() =>
    buildSourceSet(
      resolvedMobile.value.original,
      !props.optimize && props.mobile && props.retina
        ? `${pathWithoutExt.value}-mobile@2x.${extension.value}`
        : undefined,
      props.optimize,
      Boolean(props.retina),
    ),
  );

  const sources = computed<SourceDescriptor[]>(() => {
    const list: SourceDescriptor[] = [];

    if (props.mobile) {
      pushSource(list, 'mobile-avif', mobileAvif.value, 'image/avif', deviceMedia);
      pushSource(list, 'mobile-webp', mobileWebp.value, 'image/webp', deviceMedia);
      pushSource(list, 'mobile-original', mobileOriginalSource.value, mimeType.value, deviceMedia);
      pushSource(list, 'desktop-avif', desktopAvif.value, 'image/avif');
      pushSource(list, 'desktop-webp', desktopWebp.value, 'image/webp');
      return list;
    }

    if (props.onlyDesktop) {
      pushSource(list, 'mobile-empty', TRANSPARENT_GIF_DATA_URI, undefined, deviceMedia);
      pushSource(list, 'desktop-avif', desktopAvif.value, 'image/avif');
      pushSource(list, 'desktop-webp', desktopWebp.value, 'image/webp');
      return list;
    }

    if (props.onlyMobile) {
      pushSource(list, 'mobile-avif', mobileAvif.value, 'image/avif', deviceMedia);
      pushSource(list, 'mobile-webp', mobileWebp.value, 'image/webp', deviceMedia);
      pushSource(list, 'mobile-original', mobileOriginalSource.value, mimeType.value, deviceMedia);
      return list;
    }

    pushSource(list, 'desktop-avif', desktopAvif.value, 'image/avif');
    pushSource(list, 'desktop-webp', desktopWebp.value, 'image/webp');
    return list;
  });

  const imageSrc = computed(() => {
    if (props.onlyMobile) return TRANSPARENT_GIF_DATA_URI;
    return desktopOriginalImage.value;
  });

  return {
    imageSrc,
    sources,
  };
}

export function resolveMobilePath(publicPath: string): string {
  return toMobilePath(publicPath);
}
