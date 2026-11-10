<template>
  <div class="page page-home">
    <main class="main-content">
      <Container>
        <section class="home">
          <h1 class="h1">Главная страница</h1>
          <p>Добро пожаловать в Nuxt Template!</p>

          <ul class="list-bullets">
            <li>Номер 1</li>
            <li>номер 2</li>
            <li>Номер 3 Номер 3 Номер 3 Номер 3 Номер 3</li>
          </ul>

          <nav class="page-nav">
            <ul>
              <li>
                <NuxtLink v-slot="{ navigate }" to="/__demos__/ui" custom>
                  <VButton :variant="['small']" @click="navigate"> UI компоненты </VButton>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink v-slot="{ navigate }" to="/__demos__/about" custom>
                  <VButton :variant="['small']" @click="navigate"> О нас </VButton>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink v-slot="{ navigate }" to="/__demos__/protected" custom>
                  <VButton :variant="['small']" @click="navigate"> Защищенная страница (доступ закрыт) </VButton>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink v-slot="{ navigate }" to="/__demos__/protected#login" custom>
                  <VButton :variant="['small']" @click="navigate"> Защищенная страница (доступ открыт) </VButton>
                </NuxtLink>
              </li>
            </ul>
          </nav>
        </section>
      </Container>
    </main>
  </div>
</template>

<script setup>
import Container from '~/components/UI/Container/Container.vue';
import VButton from '~/components/UI/VButton/VButton.vue';

// import Header from '@/components/Header/Header.vue';
// import SvgIcon from '@/components/UI/SvgIcon.vue';
// import SocialShare from '@/components/UI/SocialShare.vue';
// import { useCounterStore } from '@/stores/counter';
// import { useSeo } from '@/composables/useSeo';

// useSeo({
//   title: 'Главная страница',
//   description:
//     'Добро пожаловать в Nuxt Template - современный шаблон для создания веб-приложений на Nuxt 3',
//   keywords: 'nuxt, vue, template, шаблон, nuxt 3, pinia'
// });

// const counter = useCounterStore();
</script>

<style scoped lang="scss">
.page-nav {
  ul {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: vc(15);
  }
}

.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: vc(20);
  gap: vc(30);
}
</style>
