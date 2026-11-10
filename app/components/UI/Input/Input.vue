<template>
  <input v-model="model" class="input" v-bind="$attrs" :class="{ error: showError }" @input="onInput" @blur="onBlur" />
</template>

<script setup>
import { useField } from 'vee-validate';
import { computed } from 'vue';

const attrs = useAttrs();
const model = defineModel();

const { value, errorMessage, meta } = useField(attrs.name, undefined, {
  initialValue: model.value,
});

model.value = value.value;

const showError = computed(() => {
  return meta.validated && !!errorMessage.value;
});

const onBlur = () => {
  value.value = model.value;
};

const onInput = (e) => {
  if (e.target.type === 'checkbox' || e.target.type === 'radio') {
    value.value = e.target.checked;
  } else if (errorMessage.value) {
    value.value = model.value;
  }
};

watch(value, () => (model.value = value.value));
</script>

<style>
@import 'index.scss';
</style>
