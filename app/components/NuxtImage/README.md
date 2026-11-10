# NuxtImage

`NuxtImage` - компонент для адаптивных изображений с серверной оптимизацией и fallback-режимом.

## Где находится

- Компонент: `app/components/NuxtImage/NuxtImage.vue`
- Логика: `app/components/NuxtImage/useNuxtImage.ts`
- Типы: `app/components/NuxtImage/types.ts`
- Константы: `app/components/NuxtImage/constants.ts`

## Что делает

- Строит `<picture>` с `avif/webp/original` по флагам.
- Поддерживает мобильную версию `-mobile` при `:mobile="true"`.
- При `optimize=true` и `webp/avif` флагах запрашивает `/api/picture.optimize`.
- В client-only рендеринге (когда страница не серверно отрендерена) использует fallback на исходные пути.
- При ошибках всегда откатывается на исходные пути.

## Props

- `src: string` - путь к файлу с расширением, например `assets/images/cat.png`
- `alt?: string` - alt-текст
- `mime?: string` - mime для оригинала (если не задан, определяется по расширению `src`)
- `decoding?: 'async' | 'auto' | 'sync'` - атрибут `<img decoding>`
- `loading?: 'eager' | 'lazy'` - атрибут `<img loading>`
- `width?: string | number`
- `height?: string | number`
- `retina?: boolean` - добавляет `2x` source set для fallback-режима без optimize
- `webp?: boolean` - генерировать/использовать `webp`
- `avif?: boolean` - генерировать/использовать `avif`
- `mobile?: boolean` - использовать пару `*-mobile`
- `optimize?: boolean` - включить серверную оптимизацию
- `optimizeOriginal?: boolean` - использовать оптимизированный original
- `onlyDesktop?: boolean` - контент только для desktop
- `onlyMobile?: boolean` - контент только для mobile
- `attributes?: HTMLAttributes` - дополнительные атрибуты (сейчас используется `style`)
- `baseDir?: string` - базовый путь (оставлен для совместимости)

## optimize vs optimizeOriginal

- `optimize`
  - Главный выключатель оптимизации.
  - `false` => оптимизация полностью отключена: API не вызывается, используются исходные/fallback пути.
  - `true` => оптимизация разрешена.

- `optimizeOriginal`
  - Управляет оптимизацией только оригинального формата (`jpg/png/...`).
  - Не управляет `webp/avif` (ими управляют `webp` и `avif`).

### Сценарии

1. `optimize=false`
   - Ничего не оптимизируется, даже если `optimizeOriginal=true`, `webp=true`, `avif=true`.

2. `optimize=true`, `optimizeOriginal=true`, `webp=false`, `avif=false`
   - Оптимизируется только оригинал.

3. `optimize=true`, `optimizeOriginal=false`, `webp=true`, `avif=false`
   - Генерируется только `webp`, оригинал остается исходным.

4. `optimize=true`, `optimizeOriginal=true`, `webp=true`, `avif=true`
   - Генерируются все варианты: optimized original + webp + avif.

### Примеры

```vue
<!-- Только оригинал -->
<NuxtImage src="assets/images/hero.png" :optimize="true" :optimizeOriginal="true" />
```

```vue
<!-- Только webp -->
<NuxtImage src="assets/images/hero.png" :optimize="true" :optimizeOriginal="false" :webp="true" />
```

```vue
<!-- Полный набор -->
<NuxtImage src="assets/images/hero.png" :optimize="true" :optimizeOriginal="true" :webp="true" :avif="true" />
```

```vue
<!-- Полностью без оптимизации -->
<NuxtImage src="assets/images/hero.png" :optimize="false" :optimizeOriginal="true" :webp="true" :avif="true" />
```

## Поведение по режимам рендера

- SSR / server-rendered route:
  - вызов API `/api/picture.optimize`
  - при успехе подставляются optimized пути
  - при ошибке fallback на оригиналы

- CSR-only route (страница не server-rendered):
  - API не вызывается
  - используется fallback на исходные пути

## Источник путей

Компонент использует `runtimeConfig.public.picturePaths`, который заполняется из:

- `project-config/base.ts` -> `PICTURE_PATHS`

Ключи:

- `assetsPublicRoot`
- `optimizedPublicRoot`
- `prebuildScanPublicRoot`

## Поддержка prebuild

Для генерации optimized-картинок перед сборкой:

```bash
npm run images:prepare
```

Скрипт: `npm-scripts/picture-prebuild.ts`
