import type { Ref } from 'vue';

export interface BasicFormValues {
  email: string;
  password: string;
}

export interface BasicFormReturn {
  email: Ref<string>;
  password: Ref<string>;
  handleEmailChange: (event: Event) => void;
  handlePasswordChange: (event: Event) => void;
  onSubmit: (values: BasicFormValues) => void;
  errors: Ref<Record<string, string>>;
}

export function basicFormExample() {
  // import { useForm, useField } from 'vee-validate';
  // import * as yup from 'yup';
  //
  // const schema = yup.object({
  //   email: yup.string().required('Email обязателен').email('Неверный формат email'),
  //   password: yup.string().required('Пароль обязателен').min(6, 'Минимум 6 символов'),
  // });
  //
  // const { handleSubmit, errors } = useForm<BasicFormValues>({
  //   validationSchema: schema,
  // });
  //
  // const { value: email, handleChange: handleEmailChange } = useField<string>('email');
  // const { value: password, handleChange: handlePasswordChange } = useField<string>('password');
  //
  // const onSubmit = handleSubmit((values: BasicFormValues) => {
  //   console.log('Отправка формы:', values);
  // });
  //
  // return {
  //   email,
  //   password,
  //   handleEmailChange,
  //   handlePasswordChange,
  //   onSubmit,
  //   errors,
  // };
}

export interface CustomFormValues {
  username: string;
  age: number;
  phone?: string;
}

export interface CustomFormReturn {
  username: Ref<string>;
  age: Ref<number>;
  phone: Ref<string>;
  onSubmit: (values: CustomFormValues) => void;
  errors: Ref<Record<string, string>>;
}

export function customValidationExample() {
  // import { useForm, useField } from 'vee-validate';
  // import * as yup from 'yup';
  //
  // const schema = yup.object({
  //   username: yup
  //     .string()
  //     .required('Имя пользователя обязательно')
  //     .min(3, 'Минимум 3 символа')
  //     .matches(/^[a-zA-Z0-9_]+$/, 'Только буквы, цифры и подчеркивание'),
  //   age: yup
  //     .number()
  //     .required('Возраст обязателен')
  //     .min(18, 'Минимум 18 лет')
  //     .max(100, 'Максимум 100 лет'),
  //   phone: yup
  //     .string()
  //     .matches(/^\+7\d{10}$/, 'Формат: +7XXXXXXXXXX'),
  // });
  //
  // const { handleSubmit, errors } = useForm<CustomFormValues>({
  //   validationSchema: schema,
  // });
  //
  // const { value: username } = useField<string>('username');
  // const { value: age } = useField<number>('age');
  // const { value: phone } = useField<string>('phone');
  //
  // const onSubmit = handleSubmit((values: CustomFormValues) => {
  //   console.log('Данные:', values);
  // });
  //
  // return {
  //   username,
  //   age,
  //   phone,
  //   onSubmit,
  //   errors,
  // };
}

export interface AsyncFormValues {
  email: string;
}

export interface AsyncFormReturn {
  email: Ref<string>;
  onSubmit: (values: AsyncFormValues) => void;
  errors: Ref<Record<string, string>>;
}

export function asyncValidationExample() {
  // import { useForm, useField } from 'vee-validate';
  // import * as yup from 'yup';
  //
  // const checkEmailExists = async (email: string) => {
  //   const response = await fetch(`/api/check-email?email=${email}`);
  //   const data = await response.json();
  //   return !data.exists;
  // };
  //
  // const schema = yup.object({
  //   email: yup
  //     .string()
  //     .required('Email обязателен')
  //     .email('Неверный формат email')
  //     .test('email-exists', 'Email уже используется', checkEmailExists),
  // });
  //
  // const { handleSubmit, errors } = useForm<AsyncFormValues>({
  //   validationSchema: schema,
  // });
  //
  // const { value: email } = useField<string>('email');
  //
  // const onSubmit = handleSubmit((values: AsyncFormValues) => {
  //   console.log('Email свободен:', values.email);
  // });
  //
  // return {
  //   email,
  //   onSubmit,
  //   errors,
  // };
}

export interface ConditionalFormValues {
  hasNewsletter: boolean;
  email?: string;
}

export interface ConditionalFormReturn {
  hasNewsletter: Ref<boolean>;
  email: Ref<string>;
  onSubmit: (values: ConditionalFormValues) => void;
  errors: Ref<Record<string, string>>;
}

export function conditionalValidationExample() {
  // import { useForm, useField } from 'vee-validate';
  // import * as yup from 'yup';
  //
  // const schema = yup.object({
  //   hasNewsletter: yup.boolean(),
  //   email: yup.string().when('hasNewsletter', {
  //     is: true,
  //     then: (schema) => schema.required('Email обязателен для подписки').email('Неверный формат'),
  //     otherwise: (schema) => schema.notRequired(),
  //   }),
  // });
  //
  // const { handleSubmit, errors } = useForm<ConditionalFormValues>({
  //   validationSchema: schema,
  // });
  //
  // const { value: hasNewsletter } = useField<boolean>('hasNewsletter');
  // const { value: email } = useField<string>('email');
  //
  // const onSubmit = handleSubmit((values: ConditionalFormValues) => {
  //   console.log('Данные:', values);
  // });
  //
  // return {
  //   hasNewsletter,
  //   email,
  //   onSubmit,
  //   errors,
  // };
}

export interface DebouncedFormValues {
  search: string;
}

export interface DebouncedFormReturn {
  search: Ref<string>;
  onSubmit: (values: DebouncedFormValues) => void;
  errors: Ref<Record<string, string>>;
}

export function debouncedValidationExample() {
  // import { useForm, useField } from 'vee-validate';
  // import * as yup from 'yup';
  //
  // const schema = yup.object({
  //   search: yup.string().min(3, 'Минимум 3 символа'),
  // });
  //
  // const { handleSubmit, errors } = useForm<DebouncedFormValues>({
  //   validationSchema: schema,
  // });
  //
  // const { value: search } = useField<string>('search', undefined, {
  //   validateOnBlur: false,
  //   validateOnChange: true,
  //   validateOnInput: false,
  // });
  //
  // const onSubmit = handleSubmit((values: DebouncedFormValues) => {
  //   console.log('Поиск:', values.search);
  // });
  //
  // return {
  //   search,
  //   onSubmit,
  //   errors,
  // };
}
