import type { ModuleOptions } from 'nuxt-svgo';

export const svgoConfig: Partial<ModuleOptions> = {
  autoImportPath: './assets/static-icons/',
  dts: true,
  svgoConfig: {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
          },
        },
      },
    ],
  },
};
