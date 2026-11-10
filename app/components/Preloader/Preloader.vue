<template>
  <Transition name="fade">
    <div v-if="state.isVisible" :class="['preloader-popup']" role="status" aria-live="polite" aria-busy="true">
      <div class="preloader-popup__content">
        <div class="preloader">
          <Container>
            <div class="preloader__content">
              <div class="preloader__content-wrap">
                <!-- <VPicture
                  class="preloader__img"
                  path="images/preloader/horse"
                  alt="лошадка"
                  ext="png"
                  :webp="true"
                  :mobile="true"
                /> -->
                <div
                  class="preloader__percent"
                  role="progressbar"
                  :aria-valuenow="Math.round(state.progress)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  {{ Math.round(state.progress) }}%
                </div>
                <div class="preloader__text" v-html="texts[textCounter]"></div>
                <!-- <div class="preloader__progress mt-16">
                    <span :style="`width: ${state.progress}%`"></span>
                  </div> -->
              </div>
            </div>
            <!-- <VPicture
              class="preloader__decor"
              path="images/preloader/stars"
              alt="декор"
              ext="png"
              :webp="true"
              :mobile="true"
            /> -->
          </Container>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { usePreloaderStore } from '~/stores/preloaderStore';
import Container from '../UI/Container/Container.vue';

const { state, setAllItems, update } = usePreloaderStore();
const baseDir = helpers.getBaseDir();
const textCounter = ref(0);
const texts = ['текст_1', 'текст_2', ' текст_3', 'текст_4', 'текст_5', 'текст_6'];

const reloadImage = ['decor.webp'];

onMounted(() => {
  setAllItems(reloadImage.length);

  reloadImage.forEach((item) => {
    const newImage = new Image();
    newImage.onload = () => {
      update();
    };

    newImage.onerror = () => {
      // console.log(newImage.src, 'error');
      update();
    };
    newImage.src = baseDir + `/assets/images/${item}`;
  });
});

// onMounted(() => {
//   interval = setInterval(() => {
//     textCounter.value++;
//     if (textCounter.value >= texts.length) {
//       textCounter.value = 0;
//     }

//     if (!state.isVisible) {
//       clearInterval(interval);
//     }
//   }, 1000);
// });

watch(
  () => state.progress,
  (value) => {
    if (value >= 100) {
      textCounter.value = 5;
    } else if (value >= 80) {
      textCounter.value = 4;
    } else if (value >= 60) {
      textCounter.value = 3;
    } else if (value >= 40) {
      textCounter.value = 2;
    } else if (value >= 20) {
      textCounter.value = 1;
    }
  },
);
</script>

<style scoped>
@import './index.scss';
</style>
