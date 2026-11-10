<template>
  <div class="lenis-page">
    <div class="lenis-page__header">
      <h1>Пример использования Lenis</h1>
      <p>Плавный скролл с поддержкой GSAP анимаций</p>
    </div>

    <div class="lenis-page__controls">
      <button :class="{ active: !isScrolling }" @click="handleStop">Stop</button>
      <button :class="{ active: isScrolling }" @click="handleStart">Start</button>
      <button @click="handleScrollTop">В начало</button>
      <button @click="handleScrollBottom">В конец</button>
      <button @click="handleProgress25">25%</button>
      <button @click="handleProgress50">50%</button>
      <button @click="handleProgress75">75%</button>
      <button @click="handleProgress100">100%</button>
    </div>

    <div class="lenis-page__progress">
      <div class="progress-bar" :style="{ width: `${progress * 100}%` }"></div>
      <span class="progress-text">{{ Math.round(progress * 100) }}%</span>
    </div>

    <div class="lenis-page__content">
      <section class="lenis-page__section" data-animate="fade">
        <div class="section-content">
          <h2>Блок с fade анимацией</h2>
          <p>Этот блок плавно появляется при скролле с эффектом затухания</p>
          <div class="section-demo">
            <div class="demo-box"></div>
            <div class="demo-box"></div>
            <div class="demo-box"></div>
          </div>
        </div>
      </section>

      <section class="lenis-page__section" data-animate="slide">
        <div class="section-content">
          <h2>Блок с slide анимацией</h2>
          <p>Элементы выезжают слева с плавным появлением</p>
          <div class="section-demo">
            <div class="demo-box slide-item"></div>
            <div class="demo-box slide-item"></div>
            <div class="demo-box slide-item"></div>
          </div>
        </div>
      </section>

      <section class="lenis-page__section" data-animate="scale">
        <div class="section-content">
          <h2>Блок с scale анимацией</h2>
          <p>Элементы увеличиваются при появлении с эффектом отскока</p>
          <div class="section-demo">
            <div class="demo-box scale-item"></div>
            <div class="demo-box scale-item"></div>
            <div class="demo-box scale-item"></div>
          </div>
        </div>
      </section>

      <section class="lenis-page__section" data-animate="rotate">
        <div class="section-content">
          <h2>Блок с rotate анимацией</h2>
          <p>Элементы вращаются при появлении</p>
          <div class="section-demo">
            <div class="demo-box rotate-item"></div>
            <div class="demo-box rotate-item"></div>
            <div class="demo-box rotate-item"></div>
          </div>
        </div>
      </section>

      <section class="lenis-page__section" data-animate="parallax">
        <div class="section-content">
          <h2>Параллакс эффект</h2>
          <p>Элементы движутся с разной скоростью при скролле</p>
          <div class="parallax-container">
            <div class="parallax-item" data-speed="0.5">Слой 1</div>
            <div class="parallax-item" data-speed="0.3">Слой 2</div>
            <div class="parallax-item" data-speed="0.1">Слой 3</div>
          </div>
        </div>
      </section>

      <div class="lenis-page__spacer"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from 'vue';
import { useLenis } from '@/libs/lenis/example';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { vc } from '@/utils/vc';

gsap.registerPlugin(ScrollTrigger);

const { lenis, progress, stop, start, scrollToTop, scrollToBottom, setProgress } = useLenis();
const isScrolling = ref(true);

const handleStop = () => {
  stop();
  isScrolling.value = false;
};

const handleStart = () => {
  start();
  isScrolling.value = true;
};

const handleScrollTop = () => {
  scrollToTop();
};

const handleScrollBottom = () => {
  scrollToBottom();
};

const handleProgress25 = () => {
  setProgress(0.25);
};

const handleProgress50 = () => {
  setProgress(0.5);
};

const handleProgress75 = () => {
  setProgress(0.75);
};

const handleProgress100 = () => {
  setProgress(1);
};

onMounted(() => {
  const animateElements = document.querySelectorAll('[data-animate]');

  animateElements.forEach((element) => {
    const type = element.getAttribute('data-animate');

    switch (type) {
      case 'fade':
        gsap.fromTo(
          element,
          { opacity: 0, y: vc(50) },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 80%',
              end: 'top 50%',
              scrub: true,
            },
          },
        );
        break;

      case 'slide': {
        gsap.fromTo(
          element,
          { x: vc(-100), opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 80%',
              end: 'top 50%',
              scrub: true,
            },
          },
        );

        const slideItems = element.querySelectorAll('.slide-item');
        slideItems.forEach((item, index) => {
          gsap.fromTo(
            item,
            { x: vc(-200), opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.8,
              delay: index * 0.1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: element,
                start: 'top 80%',
                end: 'top 50%',
                scrub: true,
              },
            },
          );
        });
        break;
      }

      case 'scale': {
        gsap.fromTo(
          element,
          { scale: 0.8, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 1,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: element,
              start: 'top 80%',
              end: 'top 50%',
              scrub: true,
            },
          },
        );

        const scaleItems = element.querySelectorAll('.scale-item');
        scaleItems.forEach((item, index) => {
          gsap.fromTo(
            item,
            { scale: 0, opacity: 0, rotation: -180 },
            {
              scale: 1,
              opacity: 1,
              rotation: 0,
              duration: 0.6,
              delay: index * 0.15,
              ease: 'back.out(1.7)',
              scrollTrigger: {
                trigger: element,
                start: 'top 80%',
                end: 'top 50%',
                scrub: true,
              },
            },
          );
        });
        break;
      }

      case 'rotate': {
        const rotateItems = element.querySelectorAll('.rotate-item');
        rotateItems.forEach((item, index) => {
          gsap.fromTo(
            item,
            { rotation: -360, opacity: 0, scale: 0.5 },
            {
              rotation: 0,
              opacity: 1,
              scale: 1,
              duration: 1,
              delay: index * 0.2,
              ease: 'elastic.out(1, 0.5)',
              scrollTrigger: {
                trigger: element,
                start: 'top 80%',
                end: 'top 50%',
                scrub: true,
              },
            },
          );
        });
        break;
      }

      case 'parallax': {
        const parallaxItems = element.querySelectorAll('.parallax-item');
        parallaxItems.forEach((item) => {
          const speed = parseFloat(item.getAttribute('data-speed') || '0.5');
          gsap.to(item, {
            y: vc(-200 * speed),
            ease: 'none',
            scrollTrigger: {
              trigger: element,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });
        });
        break;
      }
    }
  });

  watch(
    () => lenis.value,
    (newLenis) => {
      if (newLenis) {
        ScrollTrigger.refresh();
      }
    },
  );
});
</script>

<style scoped lang="scss">
@use 'sass:color';

@import '@/libs/lenis/style.scss';

.lenis-page {
  min-height: 100vh;
  background: $color-gray-0;
}

.lenis-page__header {
  padding: vc(60) vc(20) vc(40);
  text-align: center;
  color: $color-gray-0;
  background: $color-base-pressed;

  h1 {
    margin-bottom: vc(15);
    font-weight: 700;
    font-size: vc(48);
  }

  p {
    font-size: vc(18);
    opacity: 0.9;
  }
}

.lenis-page__controls {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  border-bottom: vc(1) solid rgb(0 0 0 / 10%);
  padding: vc(20);
  box-shadow: 0 vc(2) vc(10) rgb(0 0 0 / 5%);
  background: rgb(255 255 255 / 95%);
  backdrop-filter: blur(10px);
  gap: vc(10);
}

.lenis-page__controls button {
  border: vc(2) solid $color-base-pressed;
  border-radius: vc(6);
  padding: vc(12) vc(24);
  font-weight: 500;
  font-size: vc(14);
  color: $color-base-pressed;
  background: transparent;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    color: $color-gray-0;
    background: $color-base-pressed;
    transform: translateY(vc(-2));
  }

  &.active {
    color: $color-gray-0;
    background: $color-base-pressed;
  }
}

.lenis-page__progress {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 1000;
  height: vc(4);
  background: rgb(0 0 0 / 10%);

  .progress-bar {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    box-shadow: 0 0 vc(10) rgba($color-base-pressed, 0.5);
    background: $color-base-pressed;
    transition: width 0.1s;
  }

  .progress-text {
    position: absolute;
    right: vc(20);
    top: vc(8);
    border-radius: vc(4);
    padding: vc(4) vc(8);
    box-shadow: 0 vc(2) vc(8) rgb(0 0 0 / 10%);
    font-weight: 600;
    font-size: vc(12);
    color: $color-base-pressed;
    background: rgb(255 255 255 / 90%);
  }
}

.lenis-page__content {
  padding: vc(60) vc(20);
}

.lenis-page__section {
  margin-bottom: vc(150);
  border: vc(1) solid rgb(255 255 255 / 50%);
  border-radius: vc(20);
  padding: vc(60) vc(40);
  box-shadow: 0 vc(10) vc(40) rgb(0 0 0 / 8%);
  background: rgb(255 255 255 / 80%);
  backdrop-filter: blur(10px);

  &:nth-child(even) {
    background: rgba($color-base-pressed, 0.05);
  }
}

.section-content {
  margin: 0 auto;
  max-width: vc(1200);

  h2 {
    margin-bottom: vc(20);
    font-weight: 700;
    font-size: vc(36);
    color: $color-base-pressed;
  }

  p {
    margin-bottom: vc(40);
    font-size: vc(18);
    line-height: 1.8;
    color: rgb(0 0 0 / 70%);
  }
}

.section-demo {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: vc(20);
}

.demo-box {
  border-radius: vc(12);
  width: vc(120);
  height: vc(120);
  box-shadow: 0 vc(8) vc(20) rgb(0 0 0 / 15%);
  background: $color-base-pressed;
}

.slide-item {
  background: $color-base-pressed;
}

.scale-item {
  background: $color-base-pressed;
}

.rotate-item {
  background: $color-base-pressed;
}

.parallax-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: vc(12);
  height: vc(400);
  background: rgba($color-base-pressed, 0.1);
}

.parallax-item {
  position: absolute;
  border-radius: vc(12);
  padding: vc(30) vc(60);
  box-shadow: 0 vc(10) vc(30) rgb(0 0 0 / 20%);
  font-weight: 600;
  font-size: vc(24);
  color: $color-gray-0;
  background: $color-base-pressed;

  &:nth-child(1) {
    left: 50%;
    top: vc(50);
    z-index: 3;
    transform: translateX(-50%);
  }

  &:nth-child(2) {
    left: 50%;
    top: vc(150);
    z-index: 2;
    opacity: 0.8;
    transform: translateX(-50%);
  }

  &:nth-child(3) {
    left: 50%;
    top: vc(250);
    z-index: 1;
    opacity: 0.6;
    transform: translateX(-50%);
  }
}

.lenis-page__spacer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: vc(800);
  font-size: vc(24);
  color: rgb(0 0 0 / 30%);
}
</style>
