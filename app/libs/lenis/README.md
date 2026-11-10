# Lenis - плавный скролл

## Установка

Для работы нужно установить пакет lenis:

```bash
npm install lenis
```

После установки используй composable `useLenis` в своих компонентах. Для обзора методов и опций можно перенести готовую страницу `example-page.vue` в pages.

## Базовое использование

```vue
<script setup>
import { useLenis } from '@/libs/lenis/example';

const { lenis, progress, stop, start, scrollToTop, scrollToBottom, setProgress } = useLenis();
</script>
```

## Методы

### stop()
Останавливает скролл. Полезно когда открываешь модалку или меню.

```javascript
stop();
```

### start()
Возобновляет скролл после остановки.

```javascript
start();
```

### scrollTo(target, options)
Прокручивает к определенному элементу или позиции.

```javascript
scrollTo('#section-id');
scrollTo(500);
scrollTo(document.querySelector('.my-element'));
```

### scrollToTop()
Прокручивает страницу в самый верх.

```javascript
scrollToTop();
```

### scrollToBottom()
Прокручивает страницу в самый низ.

```javascript
scrollToBottom();
```

### setProgress(value)
Устанавливает прогресс скролла от 0 до 1 (0% до 100%).

```javascript
setProgress(0.5); // 50%
setProgress(1);   // 100%
```

## Интеграция с GSAP

Lenis автоматически работает с GSAP ScrollTrigger. Просто используй ScrollTrigger как обычно:

```vue
<script setup>
import { onMounted } from 'vue';
import { useLenis } from '@/libs/lenis/example';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const { lenis } = useLenis();

onMounted(() => {
  gsap.fromTo('.my-element',
    { opacity: 0, y: 50 },
    {
      opacity: 1,
      y: 0,
      scrollTrigger: {
        trigger: '.my-element',
        start: 'top 80%',
        scrub: true
      }
    }
  );
});
</script>
```

## Анимация блоков при скролле

Можно использовать data-атрибуты для автоматической анимации:

```vue
<template>
  <section data-animate="fade">Блок с fade анимацией</section>
  <section data-animate="slide">Блок с slide анимацией</section>
  <section data-animate="scale">Блок с scale анимацией</section>
</template>
```

Смотри пример в `example.vue` как это реализовано.

## Прогресс скролла

`progress` - это реактивная переменная от 0 до 1, которая показывает текущий прогресс прокрутки страницы.

```vue
<template>
  <div>Прогресс: {{ Math.round(progress * 100) }}%</div>
</template>
```

## Настройка опций

Можешь передать свои опции при инициализации:

```javascript
const { lenis } = useLenis({
  duration: 1.5,
  easing: (t) => t * (2 - t),
  smoothWheel: true,
  wheelMultiplier: 0.8
});
```

Все опции смотри в официальной документации Lenis.
