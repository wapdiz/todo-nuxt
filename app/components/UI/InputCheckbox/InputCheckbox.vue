<template>
  <label class="checkbox-label">
    <slot name="input" />
    <span class="flex">
      <span class="checkbox"></span>
      <span class="checkbox-text">
        <span>
          <slot name="label" />
        </span>
      </span>
    </span>
    <slot name="error" />
  </label>
</template>

<script setup></script>

<style>
@import 'index.scss';
</style>
