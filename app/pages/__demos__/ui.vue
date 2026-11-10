<template>
  <div class="page page-ui">
    <main class="main-content">
      <Container>
        <NuxtLink to="/" class="link h2">На главную</NuxtLink>

        <section class="ui">
          <h1 class="h1 mt-30">UI компоненты</h1>

          <div class="ui__block">
            <h2 class="h2">useScroll</h2>
            <ul class="elements">
              <li>
                <VButton :variant="['small']" @click="scrollStop"> scrollStop </VButton>
              </li>
              <li>
                <VButton :variant="['small']" @click="scrollResume"> scrollResume </VButton>
              </li>
              <li>
                <VButton :variant="['small']" @click="scrollTo('#buttons')"> scrollTo('#buttons') </VButton>
              </li>
              <li>
                <VButton :variant="['small']" @click="scrollToTop"> scrollToTop </VButton>
              </li>
            </ul>
            <br />
            <h2 class="h2">directionRef (узнать направление скролла)</h2>
            <div class="wrapper">
              <div class="elements">
                <h3 class="h3"><strong>directionRef</strong> = {{ directionRef }} - направление скролла</h3>
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">UI компоненты</h2>
            <div class="wrapper">
              <div class="elements">
                <h3 class="h3"><strong>Container</strong> - блок обёртка для основного контента страницы</h3>
                <h3 class="h3">
                  <strong>VButton</strong> - кнопка с кастомными атрибутами и состояниями. Можно оформить ссылку в виде
                  кнопки
                </h3>
                <h3 class="h3"><strong>Popup</strong> - всплывающее окно</h3>
                <h3 class="h3"><strong>ShareList</strong> - список кнопок для шеринга</h3>
                <h3 class="h3"><strong>SocialButton</strong> - кнопка для шеринга ('vk', 'ok', 'tg')</h3>
                <h3 class="h3">
                  <strong>VPicture</strong> - адаптивный компонент изображения с поддержкой ретины и WebP
                </h3>
                <h3 class="h3"><strong>VPlayer</strong> - компонент видео плеера</h3>
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">Важные компоненты</h2>
            <div class="wrapper">
              <div class="elements">
                <h3 class="h3">
                  <strong>CopyUrl</strong> - кнопка для копирования ссылки на страницу (Находится в ShareList)
                </h3>
                <h3 class="h3"><strong>GoToTop</strong> - кнопка, чтобы вернуться наверх</h3>
                <h3 class="h3"><strong>Preloader</strong> - прелоадер страницы</h3>
              </div>
            </div>
          </div>

          <div id="buttons" class="ui__block">
            <h2 class="h2">Виды кнопок VButton</h2>
            <div class="wrapper">
              <div class="elements-btns">
                <VButton> base </VButton>
                <VButton :variant="['full']" class="is-disabled"> full disabled </VButton>
                <VButton as="a" href="/" target="_blank" :variant="['small']"> link small </VButton>
                <VButton :variant="['full', 'small']"> full small </VButton>
                <VButton :variant="['400']"> 400 </VButton>
                <VButton :variant="['400', 'green']"> 400 green </VButton>
                <VButton :variant="['400', 'white-green']"> 400 white-green </VButton>

                <VButton :variant="['full', '400']"> full 400 </VButton>

                <VButton :variant="['square']"> sq </VButton>
                <VButton :variant="['square']"> <SvgIcon name="ico" /> </VButton>
                <VButton :variant="['square', 'outline']"> sq </VButton>
                <VButton :variant="['square', 'outline']"> <SvgIcon name="ico" /> </VButton>

                <VButton :variant="['icon']">
                  <div class="icon-wrapper"><SvgIcon name="ico" /></div>
                  icon
                </VButton>

                <VButton :variant="['full', 'icon', 'green']"> <SvgIcon name="ico" /> full icon green</VButton>
                <VButton :variant="['outline']"> outline </VButton>
                <VButton :variant="['outline', 'green']"> outline green </VButton>
                <VButton :variant="['outline', 'white']"> outline white </VButton>
                <VButton :variant="['full', 'icon', 'outline']"> <SvgIcon name="ico" /> full icon outline </VButton>

                <VButton :variant="['circle', 'outline']"> cr </VButton>
                <VButton :variant="['circle', 'outline']"> <SvgIcon name="ico" /> </VButton>
                <VButton :variant="['circle']"> cr </VButton>
                <VButton :variant="['circle']"> <SvgIcon name="ico" /> </VButton>

                <VButton :variant="['pressed']"> pressed </VButton>
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">NuxtImage</h2>
            <div class="wrapper">
              <div class="elements">
                <NuxtImage
                  class="nuxt-image"
                  src="/assets/images/decor.png"
                  :webp="true"
                  :avif="true"
                  :mobile="true"
                  alt="декор"
                />
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">Кнопки шеринга ShareList</h2>
            <div class="wrapper">
              <div class="elements">
                <ShareList :names="['vk', 'ok', 'tg']" :show-copy="true" />
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">VPicture</h2>
            <div class="wrapper">
              <div class="elements">
                <VPicture
                  class="ui__decor"
                  path="/assets/images/decor"
                  ext="png"
                  alt="декор"
                  :webp="true"
                  :mobile="true"
                />
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">Кастомный скроллбар UIScrollBar</h2>
            <div class="wrapper">
              <div class="elements">
                <UIScrollBar style="height: 200px">
                  <div v-for="i in 3" :key="i" style="margin-bottom: 20px; height: 150px; background-color: #eee"></div>
                </UIScrollBar>
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">GoToTop</h2>
            <div class="wrapper">
              <div class="elements">
                <GoToTop />
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">FormRegistration (можно проверить useBaseForm и useFormGuard)</h2>
            <div class="wrapper">
              <div class="elements">
                <h3>
                  Чтобы проверить useFormGuard достаточно ввести значение в любой инпут и попытатся перейти на др.
                  стр-цу.
                </h3>
                <FormRegistration />
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">VPlayer (закомментирован)</h2>
            <div class="wrapper">
              <div class="elements">
                <!-- <VPlayer :src="videoSrc" /> -->
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">Классы типографии</h2>
            <div class="wrapper">
              <div class="elements">
                <span><strong>.h1</strong>: <span class="h1">Тест Тест Тест</span></span>
                <span><strong>.h2</strong>: <span class="h2">Тест Тест Тест</span></span>
                <span><strong>.h3</strong>: <span class="h3">Тест Тест Тест</span></span>
                <span> <strong>.desc</strong> и тэг <strong>p</strong>: <span class="h4">Тест Тест Тест</span></span>
                <span><strong>.link</strong>: <span class="link">Тест Тест Тест</span></span>
                <div class="list-wrap">
                  <strong>.list-bullets</strong>
                  <ul class="list-bullets">
                    <li>Номер 1</li>
                    <li>номер 2</li>
                    <li>Номер 3 Номер 3 Номер 3 Номер 3 Номер 3</li>
                  </ul>
                </div>
                <div class="list-wrap">
                  <strong>.list-counter</strong>
                  <ul class="list-counter">
                    <li>Номер 1</li>
                    <li>номер 2</li>
                    <li>Номер 3 Номер 3 Номер 3 Номер 3 Номер 3</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">Nuxt-svgo (импорт svg)</h2>
            <div class="wrapper">
              <div class="elements">
                <SvgoIco :font-controlled="false" :filled="true" />
              </div>
            </div>
          </div>

          <div class="ui__block">
            <h2 class="h2">Тултип</h2>
            <div class="wrapper">
              <div class="elements">
                <Tooltip content="Это подсказка для пользователя" />

                <Tooltip>
                  <template #content>
                    <strong>Важно!</strong><br />
                    Это <em>HTML-контент</em> в тултипе<br />
                    <a href="/help" target="_blank">Подробнее</a>
                  </template>
                </Tooltip>
              </div>
            </div>
          </div>
        </section>
      </Container>

      <div>
        <StickySection :mobile-disabled="true" :shading="true">
          <div class="test-fullscreen-block" style="background-color: #f50">
            <h1 class="h1">:mobile-disabled="true" :shading="true"</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
          </div>
        </StickySection>
        <StickySection>
          <div class="test-fullscreen-block" style="background-color: #f5f5f5">
            <h1 class="h1">:mobile-disabled="false" :shading="false"</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
          </div>
        </StickySection>
        <StickySection>
          <div class="test-fullscreen-block" style="background-color: #eee">
            <h1 class="h1">last block</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
            <h1 class="h1">text</h1>
          </div>
        </StickySection>
      </div>
    </main>
    <PopupTest />
  </div>
</template>

<script setup>
import FormRegistration from '~/components/FormRegistration/FormRegistration.vue';
import GoToTop from '~/components/GoToTop/GoToTop.vue';
import PopupTest from '~/components/PopupTest/PopupTest.vue';
import Container from '~/components/UI/Container/Container.vue';
import ShareList from '~/components/UI/ShareList/ShareList.vue';
import VButton from '~/components/UI/VButton/VButton.vue';
import VPicture from '~/components/UI/VPicture/VPicture.vue';
import Tooltip from '~/components/UI/Tooltip/Tooltip.vue';
// import VPlayer from '@/components/UI/VPlayer/VPlayer.vue';

// const videoSrc = '/assets/videos/plug.mp4';

const { scrollStop, scrollResume, scrollToTop, scrollTo, directionRef } = useScroll();
</script>

<style scoped lang="scss">
.page {
  background: $color-gray-2;
}

.ui {
  position: relative;
  z-index: 1;
  padding: vc(30) 0;

  &__decor {
    width: vc(300);
  }

  &__block {
    margin-top: vc(30);

    .wrapper {
      margin-top: vc(10);
    }

    .elements {
      display: flex;
      flex-direction: column;
      gap: vc(10);

      &-btns {
        display: flex;
        flex-flow: wrap;
        align-items: center;

        > * {
          margin: vc(10) vc(10) vc(10) 0;
        }
      }
    }
  }
}

.mt-30 {
  margin-top: vc(30);
}

.nuxt-image {
  width: vc(200);
  height: vc(200);

  :deep(img) {
    height: 100%;
  }
}

.test-fullscreen-block {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  height: 110vh;
}
</style>
