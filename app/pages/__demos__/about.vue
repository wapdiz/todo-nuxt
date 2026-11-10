<template>
  <div class="page page-about">
    <main class="main-content">
      <div class="container">
        <h1>О нас</h1>
        <p>Информация о проекте и его возможностях.</p>

        <section class="features">
          <h2>Преимущества</h2>
          <div class="feature-grid">
            <div class="feature-item">
              <h3>Производительность</h3>
              <p>Построен на Nuxt 3 для максимальной производительности</p>
            </div>
            <div class="feature-item">
              <h3>Современные технологии</h3>
              <p>Vue 3, Pinia, Vite</p>
            </div>
            <div class="feature-item">
              <h3>Адаптивность</h3>
              <p>Отлично работает на всех устройствах</p>
            </div>
          </div>
        </section>
        <NuxtLink to="/" class="back-link">← Вернуться на главную</NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({});
</script>

<style scoped lang="scss">
.page-about {
  min-height: 100vh;
}

.container {
  h1 {
    margin-bottom: 1.5rem;
    font-size: 2.5rem;
    color: #333;
  }

  p {
    margin-bottom: 1rem;
    font-size: 1.2rem;
    line-height: 1.6;
    color: #666;
  }
}

.features {
  margin: 3rem 0;

  h2 {
    margin-bottom: 2rem;
    font-size: 2rem;
    color: #333;
  }
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  margin-bottom: 2rem;
  gap: 2rem;
}

.feature-item {
  border-radius: 8px;
  padding: 1.5rem;
  background: #f5f5f5;

  h3 {
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
    color: #333;
  }

  p {
    font-size: 1rem;
    color: #666;
  }
}

.share-section {
  margin: 2rem 0;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f8f9fa;
}

.back-link {
  $test: 0.25rem;

  display: inline-block;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  color: #fff;
  background: #2196f3;
  transition: background 0.3s;

  &:hover {
    background: #0b7dda;
  }
}
</style>
