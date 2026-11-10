export const phoneMask = {
  mask: '+7 (###) ###-##-##',
  preProcess: (value: string) => {
    // если пользователь ввёл 8 → заменяем на 7
    if (value === '8') {
      return '7';
    }

    if (value.startsWith('8')) {
      return '7' + value.slice(1);
    }

    return value;
  },
};
