import type { ViteConfig } from 'nuxt/schema';

export const viteConfig: ViteConfig = {
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (/\.(woff2?|ttf|otf|eot)$/.test(assetInfo.names[0] ?? '')) {
            return 'assets/[name][extname]'; // без хэша
          }

          return 'assets/[name]-[hash][extname]'; // всё остальное с хэшем
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import'],
        additionalData: `
            @use "~/assets/styles/base/_variables.scss" as *;
            @use "~/assets/styles/functions/_functions.scss" as *;
            @use "~/assets/styles/mixins/_mixins.scss" as *;
          `,
      },
    },
  },
};
