import type { FilterInput, ModuleOptions } from '@nuxtjs/sitemap';
import { baseURL } from './base';

const base = baseURL.replace(/\/+$/, '');
/*
если нужно убрать определенные страницы из sitemap
например [new RegExp(`${baseURL}__demos__/about/`]
*/
const excludeUrls: FilterInput[] = [];

export const sitemapConfig: Partial<ModuleOptions> = {
  xsl: false, // можно включить для формирования удобной таблицы для простомтра sitemap
  autoLastmod: true,
  discoverImages: false,
  discoverVideos: false,
  /*
  Исключаем дублированный URL, возникающий из-за бага @nuxtjs/sitemap:
  при crawlLinks prerender-краулер находит ссылку с baseURL, а затем
  resolveSitePath добавляет baseURL ещё раз из-за несовпадения трейлинг-слеша
  */
  exclude: base ? [new RegExp(`${base}${base}`), ...excludeUrls] : excludeUrls,
  defaults: {
    priority: 0.9,
    lastmod: new Date(),
  },
  // отдельная насройка для каждого роута
  urls: [
    {
      loc: '/', // корень сайта имеет приоритет 1
      priority: 1,
    },
  ],
};
