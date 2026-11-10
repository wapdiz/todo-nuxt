import { createError, defineEventHandler, readBody } from 'h3';
import { optimizePublicImage } from '../utils/picture-optimizer';

interface OptimizeBody {
  path?: string;
  ext?: string;
  mobile?: boolean;
  optimize?: boolean;
  optimizeOriginal?: boolean;
  webp?: boolean;
  avif?: boolean;
}

interface OptimizedSet {
  original: string;
  avif?: string;
  webp?: string;
}

function normalizeAssetPath(assetPath?: string, ext?: string): string {
  if (!assetPath || typeof assetPath !== 'string') return '';

  const cleanPath = assetPath.trim().replace(/\\/g, '/');
  if (!cleanPath) return '';

  const withLeadingSlash = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  const hasExtension = /\.[a-z0-9]+$/i.test(withLeadingSlash);
  const normalizedExt = typeof ext === 'string' ? ext.trim().replace(/^\./, '') : '';

  if (hasExtension || !normalizedExt) return withLeadingSlash;
  return `${withLeadingSlash}.${normalizedExt}`;
}

function toMobilePath(desktopPath: string): string {
  return desktopPath.replace(/(\.[^.]+)$/, '-mobile$1');
}

function toFallbackSet(original: string): OptimizedSet {
  return { original };
}

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  const body = await readBody<OptimizeBody>(event);

  const desktopPath = normalizeAssetPath(body?.path, body?.ext);
  const shouldOptimize = body?.optimize !== false;
  const shouldOptimizeOriginal = body?.optimizeOriginal !== false;
  const shouldGenerateWebp = body?.webp === true;
  const shouldGenerateAvif = body?.avif === true;
  const hasConversionFlags = shouldGenerateWebp || shouldGenerateAvif;
  const shouldRunOptimization = shouldOptimizeOriginal || hasConversionFlags;

  if (!desktopPath) {
    return {
      desktop: toFallbackSet(''),
      optimized: false,
    };
  }

  if (!shouldOptimize || !shouldRunOptimization) {
    const response: { desktop: OptimizedSet; mobile?: OptimizedSet; optimized: boolean } = {
      desktop: toFallbackSet(desktopPath),
      optimized: false,
    };

    if (body?.mobile) {
      response.mobile = toFallbackSet(toMobilePath(desktopPath));
    }

    return response;
  }

  const desktop = await optimizePublicImage(desktopPath, {
    generateOriginal: shouldOptimizeOriginal,
    generateWebp: shouldGenerateWebp,
    generateAvif: shouldGenerateAvif,
  });

  const hasDesktopOptimizedOutput = desktop.original !== desktopPath || Boolean(desktop.avif) || Boolean(desktop.webp);

  if (!body?.mobile) {
    return {
      desktop,
      optimized: hasDesktopOptimizedOutput,
    };
  }

  const mobilePath = toMobilePath(desktopPath);
  const mobile = await optimizePublicImage(mobilePath, {
    generateOriginal: shouldOptimizeOriginal,
    generateWebp: shouldGenerateWebp,
    generateAvif: shouldGenerateAvif,
  });

  return {
    desktop,
    mobile: mobile.avif || mobile.webp || mobile.original !== mobilePath ? mobile : toFallbackSet(mobilePath),
    optimized: hasDesktopOptimizedOutput,
  };
});
