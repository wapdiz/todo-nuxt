<template>
  <div ref="menuRef" class="menu" :class="{ 'is-active': menuStore.isMenuOpen }">
    <div class="menu__content">
      <div class="menu__container">
        <nav class="menu__body" role="navigation">
          <ul class="menu-list">
            <li v-for="(page, i) in pages" :key="i" class="menu-list__item">
              <NuxtLink :to="page.path">{{ page.meta.title }}</NuxtLink>
            </li>
          </ul>
        </nav>

        <div class="menu__footer">
          <ShareList :names="['vk', 'ok', 'tg']" />
        </div>
      </div>
    </div>
  </div>
  <Transition name="fade">
    <div
      v-if="menuStore.isMenuOpen"
      class="menu-overlay"
      aria-hidden="true"
      @click="menuStore.isMenuOpen = false"
    ></div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import ShareList from '../UI/ShareList/ShareList.vue';
import useMenuStore from './useMenu';
import { useRouter } from 'vue-router';
const menuStore = useMenuStore();

const router = useRouter();
const pages = router.getRoutes().filter((page) => page.meta.menu);

const menuRef = ref<HTMLElement | null>(null);

const handleKeyDown = (e: KeyboardEvent) => {
  if (!menuStore.isMenuOpen) return;

  const menu = menuRef.value;
  if (!menu) return;

  const activeEl = document.activeElement as HTMLElement | null;
  if (!activeEl || !menu.contains(activeEl)) return;

  if (e.key === 'Escape') {
    menuStore.isMenuOpen = false;
    return;
  }

  if (e.key === 'Tab') {
    const focusable = Array.from(
      menu.querySelectorAll<HTMLElement>('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute('disabled'));

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if ((!e.shiftKey && activeEl === last) || (e.shiftKey && activeEl === first)) {
      menuStore.isMenuOpen = false;
    }
  }
};

onMounted(() => window.addEventListener('keydown', handleKeyDown));
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));
</script>

<style>
@import 'style.scss';
</style>
