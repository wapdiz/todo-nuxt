# UI Components

## VPlayer

Видеоплеер на базе нативного HTML5 video элемента с поддержкой HLS потоков. Компонент автоматически определяет тип источника и при необходимости подключает библиотеку для работы с HLS.

### Особенности

- Поддержка обычных видео форматов (mp4, webm и т.д.)
- Автоматическое определение и воспроизведение HLS потоков (.m3u8)
- Адаптивный дизайн (по умолчанию)
- Настраиваемые параметры воспроизведения
- Система аналитики событий плеера
- Полный контроль через методы компонента

### Использование

```vue
<template>
  <VPlayer
    src="https://example.com/video.mp4"
    :poster="posterUrl"
    :autoplay="false"
    :controls="true"
  />
</template>
```
### С постером

```vue
<template>
  <VPlayer 
    src="/path/to/video.mp4" 
    poster="/path/to/poster.jpg"
  />
</template>
```

### HLS потоки

Для работы с HLS потоками нужно **принудительно установить** пакет `hls.js`:

```bash
npm install hls.js
```

или

```bash
yarn add hls.js
```

или

```bash
pnpm add hls.js
```

Без установки этого пакета HLS потоки работать не будут. Компонент автоматически определит HLS источник по расширению `.m3u8` или типу MIME `application/x-mpegURL` и подключит библиотеку, если она доступна.

<template>
  <VPlayer src="https://example.com/stream.m3u8" />
</template>
```

### HLS с кастомными настройками

```vue
<template>
  <VPlayer 
    src="https://example.com/stream.m3u8" 
    :hls="{ 
      overrideNative: true, 
      maxPlaylistRetries: 5 
    }" 
  />
</template>
```

### Несколько источников

```vue
<template>
  <VPlayer 
    :sources="[
      { src: 'https://example.com/stream.m3u8', type: 'application/x-mpegURL' },
      { src: 'https://example.com/stream.mp4', type: 'video/mp4' }
    ]" 
  />
</template>
```

### Параметры

- `src` - URL видео файла
- `poster` - URL изображения-постера
- `autoplay` - автозапуск (boolean | 'muted' | 'play' | 'any')
- `preload` - стратегия предзагрузки ('auto' | 'metadata' | 'none')
- `muted` - беззвучный режим
- `loop` - зацикливание
- `controls` - показывать стандартные контролы браузера
- `playsinline` - воспроизведение встроенным (важно для мобильных)
- `responsive` - адаптивный размер
- `width` / `height` - размеры плеера
- `sources` - массив источников с типами `[{ src: string, type: string }]`
- `analytics` - объект с колбэками для аналитики
- `hls` - конфигурация для HLS.js

### Методы компонента

Через ref можно получить доступ к методам:

```vue
<script setup>
const playerRef = ref(null);

// Воспроизведение
playerRef.value?.play();
playerRef.value?.pause();
playerRef.value?.togglePlay();

// Управление временем
playerRef.value?.setCurrentTime(30);
const currentTime = playerRef.value?.getCurrentTime();
const duration = playerRef.value?.getDuration();

// Громкость
playerRef.value?.setVolume(0.5);
playerRef.value?.setMuted(true);
const volume = playerRef.value?.getVolume();

// Полноэкранный режим
playerRef.value?.toggleFullscreen();
</script>
```

### Аналитика

Можно передать объект с колбэками для отслеживания событий:

```vue
<VPlayer
  :src="videoSrc"
  :analytics="{
    onFirstPlay: (video) => console.log('Первое воспроизведение'),
    onPlay: (video) => console.log('Воспроизведение'),
    onPause: (video, time) => console.log('Пауза на', time),
    onEnded: (video) => console.log('Видео закончилось'),
    onTimeUpdate: (video, time) => console.log('Текущее время', time)
  }"
/>
```

### HLS конфигурация

Если нужно переопределить нативный HLS или настроить параметры библиотеки:

```vue
<VPlayer
  src="https://example.com/stream.m3u8"
  :hls="{
    overrideNative: true,
    enableLowInitialPlaylist: true,
    maxPlaylistRetries: 5
  }"
/>
```
