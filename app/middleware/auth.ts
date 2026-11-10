// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineNuxtRouteMiddleware(async (to, from) => {
  await new Promise((resolve) => setTimeout(resolve, 2000)); // имитация получения данных (не обязательно)

  // тут логика проверки, для примера испозуем хеш
  if (to.hash !== '#login') {
    return navigateTo('/login');
  }
});
