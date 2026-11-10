import { defineNuxtConfig } from 'nuxt/config';
import { PICTURE_PATHS, baseURL, domain, isBuild, isProd } from './project-config/base';
import { fontsConfig } from './project-config/fonts';
import { createHeadConfig } from './project-config/head';
import { sitemapConfig } from './project-config/sitemap';
import { svgSpriteConfig } from './project-config/svg-sprite';
import { viteConfig } from './project-config/vite';
import { svgoConfig } from './project-config/svgo';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', 'nuxt-svg-sprite-icon', '@nuxt/fonts', 'nuxt-svgo', domain && '@nuxtjs/sitemap'],
  ...(domain
    ? {
        sitemap: sitemapConfig,
        site: { url: domain, trailingSlash: true }, // домен для путей в sitemap
      }
    : {}),
  fonts: fontsConfig,
  runtimeConfig: {
    n8nWebhookUrl: '',
    n8nAuthHeaderName: 'X-Todo-Ai-Token',
    n8nAuthHeaderValue: '',
    aiTrustProxy: false,
    aiRateLimitPerMinute: 12,
    aiDailyRequestLimit: 200,
    aiMaxConcurrentPerIp: 1,
    aiMaxConcurrentGlobal: 4,
    public: {
      picturePaths: PICTURE_PATHS,
    },
  },
  // ssr: false,
  // routeRules: {
  //   '/**': { ssr: false },
  //   '/': { ssr: true },
  // },
  nitro: {
    output: {
      dir: 'output',
    },
  },
  typescript: {
    typeCheck: false,
  },
  devServer: {
    port: 3000,
    host: '127.0.0.1',
  },
  app: {
    baseURL: baseURL,
    buildAssetsDir: isBuild ? '/assets' : undefined, // default: '_nuxt'
    head: createHeadConfig(),
    pageTransition: { name: 'fade', mode: 'out-in' },
  },
  postcss: {
    plugins: {
      autoprefixer: {},
      // 'postcss-preset-env': {
      //   stage: 2,
      //   browsers: 'last 2 versions',
      // },
    },
  },
  svgSprite: svgSpriteConfig,
  css: ['@/assets/styles/main.scss'],
  vite: viteConfig,
  svgo: svgoConfig,

  ignore: isProd ? ['/app/pages/__demos__/**'] : [],
  experimental: {
    //   entryImportMap: false, // отключение importMap для моддержки safari 15 при сборке статики
    defaults: {
      nuxtLink: {
        trailingSlash: 'append', // добавляет слеш в конец всех внутренних ссылок для SEO
      },
    },
  },
});
