import type { ModuleOptions } from 'nuxt-svg-sprite-icon';

export const svgSpriteConfig: ModuleOptions = {
  // example <SvgIcon name="ico" />
  input: '~/assets/icons',
  output: '~/assets/sprites',
  defaultSprite: 'icons',
  elementClass: 'svg-icon',
};
