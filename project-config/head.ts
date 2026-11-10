import type { NuxtAppConfig } from '@nuxt/schema';
import { description, shareImage, title } from './base';

export function createHeadConfig(): NuxtAppConfig['head'] {
  return {
    htmlAttrs: {
      lang: 'ru',
    },
    title: title,
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
    meta: [
      {
        name: 'description',
        content: description,
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'ru_RU' },
      { property: 'og:title', content: title },
      {
        property: 'og:description',
        content: description,
      },
      { property: 'og:image', content: shareImage },
      { property: 'og:image:type', content: 'image/jpeg' },
      { property: 'og:image:width', content: '700' },
      { property: 'og:image:height', content: '500' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      {
        name: 'twitter:description',
        content: description,
      },
      { name: 'twitter:image', content: shareImage },
    ],
    script: [
      // {
      //   src: `https://telegram.org/js/telegram-web-app.js?${telegramWebAppVersion}`,
      //   tagPosition: 'head',
      // }, Расскоментировать если нужно подключить скрипт телеграма
    ],
  };
}
