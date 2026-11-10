export const domain = null; // 'https://example.com' указать боевой url сайта, для корректной сборки sitemap
export const isBuild = process.env.NODE_ENV === 'production';
export const isProd = process.env.IS_PROD === 'true';
// заменить на путь боевого сервера, если он отличается, например /inner-folder-on-server/
export const baseURL = isProd ? '/' : '/';
export const title = 'nuxt template title';
export const description = 'nuxt template description';
export const shareImage = `${baseURL}assets/images/share/share.jpg`;

export const telegramWebAppVersion = '56';

export const PICTURE_PATHS = {
  assetsPublicRoot: '/assets/images',
  optimizedPublicRoot: '/assets/images/optimized',
  prebuildScanPublicRoot: '/assets',
} as const;
