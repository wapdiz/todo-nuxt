<template>
  <div class="container">
    <h1>закрытая страница</h1>
    <nuxt-link to="/"><button class="btn secondary">Вернуться на главную</button></nuxt-link>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'], // Apply the 'auth' middleware to this page
});
</script>
