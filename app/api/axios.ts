// import { config } from '@/configuration';
// import axios from 'axios';
// import { usePopupStore } from '../stores/popupStore';

// // Базовая конфигурация
// const instance = axios.create({
//   baseURL: config.api.base,
//   headers: {
//     Accept: 'application/json',
//   },
//   timeout: 10000,
//   withCredentials: true,
//   withXSRFToken: true,
// });

// // Интерцепторы запросов
// // instance.interceptors.request.use(
// //   (config) => {
// //     const token = localStorage.getItem('token');
// //     if (token) {
// //       config.headers.Authorization = `Bearer ${token}`;
// //     }
// //     return config;
// //   },
// //   (error) => Promise.reject(error)
// // );

// // Интерцепторы ответов
// instance.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.config.skipInterceptor) {
//       return Promise.reject(error); // пропускаем стандартную обработку
//     }

//     // if (error.response?.status == 404) {
//     //   // Обработка 404 ошибки
//     // }

//     // общая обработка ошибок
//     console.error(error.message);
//     const { openPopup } = usePopupStore();
//     openPopup('error');

//     return Promise.reject(error);
//   },
// );

// export default instance;
