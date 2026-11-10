<template>
  <div class="vee-validate-examples">
    <h2>Примеры VeeValidate</h2>

    <form class="form-example" @submit="onSubmit">
      <h3>Базовая форма</h3>

      <div class="field">
        <label for="email">Email:</label>
        <input id="email" v-model="email" type="email" placeholder="example@mail.com" />
        <span v-if="errors.email" class="error">{{ errors.email }}</span>
      </div>

      <div class="field">
        <label for="password">Пароль:</label>
        <input id="password" v-model="password" type="password" placeholder="Минимум 6 символов" />
        <span v-if="errors.password" class="error">{{ errors.password }}</span>
      </div>

      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Отправка...' : 'Отправить' }}
      </button>
    </form>

    <form class="form-example" @submit="onSubmitNewsletter">
      <h3>Подписка на рассылку</h3>

      <div class="field">
        <label>
          <input v-model="hasNewsletter" type="checkbox" />
          Хочу получать новости
        </label>
      </div>

      <div v-if="hasNewsletter" class="field">
        <label for="newsletter-email">Email для рассылки:</label>
        <input id="newsletter-email" v-model="newsletterEmail" type="email" placeholder="your@email.com" />
        <span v-if="errors.newsletterEmail" class="error">
          {{ errors.newsletterEmail }}
        </span>
      </div>

      <button type="submit">Подписаться</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, type Ref } from 'vue';
import type { BasicFormValues, ConditionalFormValues } from './example';

// import { useForm, useField } from 'vee-validate';
// import * as yup from 'yup';
//
// const schema = yup.object({
//   email: yup.string().required('Email обязателен').email('Неверный формат email'),
//   password: yup.string().required('Пароль обязателен').min(6, 'Минимум 6 символов'),
// });
//
// const { handleSubmit: onSubmit, errors } = useForm<BasicFormValues>({
//   validationSchema: schema,
// });
//
// const { value: email } = useField<string>('email');
// const { value: password } = useField<string>('password');
//
// const newsletterSchema = yup.object({
//   hasNewsletter: yup.boolean(),
//   newsletterEmail: yup.string().when('hasNewsletter', {
//     is: true,
//     then: (schema) => schema.required('Email обязателен').email('Неверный формат'),
//     otherwise: (schema) => schema.notRequired(),
//   }),
// });
//
// const { handleSubmit: onSubmitNewsletter, errors: newsletterErrors } = useForm<ConditionalFormValues>({
//   validationSchema: newsletterSchema,
// });
//
// const { value: hasNewsletter } = useField<boolean>('hasNewsletter');
// const { value: newsletterEmail } = useField<string>('newsletterEmail');

const email: Ref<string> = ref('');
const password: Ref<string> = ref('');
const hasNewsletter: Ref<boolean> = ref(false);
const newsletterEmail: Ref<string> = ref('');
const errors: Ref<Record<string, string>> = ref({});
const isSubmitting: Ref<boolean> = ref(false);

const onSubmit = (event: Event): void => {
  event.preventDefault();
  const formData: BasicFormValues = {
    email: email.value,
    password: password.value,
  };
  console.log('Отправка формы:', formData);
};

const onSubmitNewsletter = (event: Event): void => {
  event.preventDefault();
  const formData: ConditionalFormValues = {
    hasNewsletter: hasNewsletter.value,
    email: newsletterEmail.value,
  };
  console.log('Подписка:', formData);
};
</script>

<style scoped lang="scss">
.vee-validate-examples {
  padding: vc(20);
}

.form-example {
  margin-bottom: vc(40);
  border: vc(1) solid $color-gray;
  border-radius: vc(8);
  padding: vc(20);
  background: $color-gray;
}

.field {
  margin-bottom: vc(15);
}

label {
  display: block;
  margin-bottom: vc(5);
  font-weight: 500;
}

input[type='text'],
input[type='email'],
input[type='password'] {
  border: vc(1) solid $color-gray;
  border-radius: vc(4);
  padding: vc(8) vc(12);
  width: 100%;
  font-size: vc(14);
}

input[type='text']:focus,
input[type='email']:focus,
input[type='password']:focus {
  outline: none;
  border-color: $color-green;
}

.error {
  display: block;
  margin-top: vc(5);
  font-size: vc(12);
  color: $color-green;
}

button {
  border: none;
  border-radius: vc(4);
  padding: vc(10) vc(20);
  font-size: vc(14);
  color: $color-white;
  background: $color-base-pressed;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: $color-black;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
