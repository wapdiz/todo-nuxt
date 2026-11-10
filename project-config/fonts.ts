import type { ModuleOptions } from '@nuxt/fonts';

/*
Шрифты размещать в папке public/assets/fonts/название-шрифта/название-шрифта.woff2
Названия шрифтов для модуля @nuxt/fonts
100: "thin",
200: "extra-light",
300: "light",
400: "regular",
500: "medium",
600: "semi-bold",
700: "bold",
800: "extra-bold",
900: "black"
*/

export const fontsConfig: ModuleOptions = {
  defaults: {
    preload: true,
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], // обязательно указываем веса шрифтов используемые на проекте
  },
  providers: {
    google: false,
    googleicons: false,
    bunny: false,
    adobe: false,
    fontshare: false,
    fontsource: false,
  },
};
