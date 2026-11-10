<template>
  <form class="form red js-form-analytics" @submit="submitForm">
    <!-- name -->
    <div class="form__group">
      <div class="label">Имя</div>
      <Input id="name" name="name" type="name" placeholder="Иван" />
      <span class="error-message error-message--with-icon">{{ errors.name }}</span>
    </div>

    <!-- email -->
    <div class="form__group">
      <div class="label">
        Электронная почта
        <!-- <Tooltip
          content="Почта будет служить логином для входа на&nbsp;сайт и&nbsp;способом связи в&nbsp;случае победы в&nbsp;розыгрыше"
        /> -->
      </div>
      <Input id="email" name="email" type="email" placeholder="example@mail.ru" />
      <span class="error-message error-message--with-icon">{{ errors.email }}</span>
    </div>

    <!-- password -->
    <div class="form__group">
      <div class="label">
        Пароль
        <!-- <Tooltip content="Придумайте пароль, чтобы авторизоваться" /> -->
      </div>
      <Input id="password" name="password" type="password" placeholder="********" />
      <span class="error-message error-message--with-icon">{{ errors.password }}</span>
    </div>

    <!-- phone -->
    <div class="form__group">
      <div class="label">
        Телефон
        <!-- <Tooltip :interactive="true" zIndex="2">
          <template #content>
            Убедитесь, что задания выполняются через указанный в&nbsp;форме номер телефона,
            к&nbsp;которому привязан ваш аккаунт.
            <button class="link" type="button" @click="popupVisible = true">
              Как это проверить
            </button>
          </template>
</Tooltip> -->
      </div>

      <Input id="phone" v-maska="phoneMask" name="phone" type="tel" placeholder="+7 (900) 000-00-00" />

      <!-- <InputPhone v-model="values.phone" /> -->
      <span class="error-message error-message--with-icon">{{ errors.phone }}</span>
    </div>

    <!-- checkboxes -->
    <div class="checkbox-group">
      <InputCheckbox>
        <template #input>
          <Input id="agreement" name="agreement" type="checkbox" />
        </template>
        <template #label>
          <span
            >Я&nbsp;соглашаюсь на&nbsp;обработку персональных данных в&nbsp;соответствии с&nbsp;<a
              class="link"
              href="#"
              target="_blank"
              >политикой конфиденциальности</a
            ></span
          >
        </template>
        <template #error>
          <span class="error-message error-message--with-icon">{{ errors.agreement }}</span>
        </template>
      </InputCheckbox>

      <InputCheckbox>
        <template #input>
          <Input id="rules" name="rules" type="checkbox" />
        </template>
        <template #label>
          <span
            >Я&nbsp;принимаю условия
            <a class="link" href="#" target="_blank">Пользовательского соглашения</a>
            и&nbsp;<a class="link" href="#" target="_blank">Правил акции</a></span
          >
        </template>
        <template #error>
          <span class="error-message error-message--with-icon">{{ errors.rules }}</span>
        </template>
      </InputCheckbox>
    </div>

    <div class="buttons-group form__submit">
      <VButton :variant="['green']" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Регистрация...' : 'Зарегистрироваться' }}
      </VButton>
    </div>
  </form>
</template>

<script setup>
// import Tooltip from '../../components/UI/Tooptip/Tooltip.vue';
import VButton from '../../components/UI/VButton/VButton.vue';
import Input from '../../components/UI/Input/Input.vue';
import useBaseForm from '../../composables/useBaseForm';
import useFormGuard from '../../composables/useFormGuard';
import * as yup from 'yup';
import { patterns } from '../../utils/formPatterns';
import InputCheckbox from '../UI/InputCheckbox/InputCheckbox.vue';
import { useForm } from 'vee-validate';

const schema = {
  name: yup
    .string()
    .required('Поле обязательно для заполнения')
    .min(2, 'Слишком коротко')
    .max(100, 'Слишком длинно')
    .matches(patterns.name, 'Имя может содержать только буквы, пробелы и дефисы'),
  email: yup
    .string()
    .required('Поле обязательно для заполнения')
    .matches(patterns.email, 'Укажите верную электронную почту'),
  password: yup
    .string()
    .required('Поле обязательно для заполнения')
    .min(8, 'Пароль должен содержать не менее 8 символов'),
  phone: yup
    .string()
    .required('Поле обязательно для заполнения')
    .matches(patterns.phone, 'Нужен верный номер телефона'),
  agreement: yup.boolean().isTrue('Обязательно поставьте галочку, чтобы зарегистрироваться'),
  rules: yup.boolean().isTrue('Обязательно поставьте галочку, чтобы зарегистрироваться'),
};

const { errors, isSubmitting, values, handleSubmit, setFieldError } = useForm({
  initialValues: { name: '', email: '', password: '', phone: '', agreement: false, rules: false },
  validationSchema: schema,
});

const { onSubmit, onInvalidSubmit } = useBaseForm({
  onSubmit: async (values = null) => {
    console.log('Отправка на сервер:', values);

    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (values.email === 'test@example.com') {
          reject({
            response: {
              status: 422,
              data: {
                errors: {
                  email: ['Такой email уже зарегистрирован'],
                  phone: ['Этот номер телефона уже используется'],
                },
              },
            },
          });
        } else {
          resolve({ success: true });
        }
      }, 1000);
    });
  },
  onError: (error) => {
    if (error?.response?.status === 422) {
      Object.entries(error.response.data.errors).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          setFieldError(key, value[0]);
        }
      });
    }
  },
});
const { initFormTracking } = useFormGuard('test');

const submitForm = handleSubmit(onSubmit, onInvalidSubmit);

onMounted(() => {
  initFormTracking(values);
});
</script>
