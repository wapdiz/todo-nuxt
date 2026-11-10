const patterns = {
  name: /^[A-Za-zА-Яа-яЁё]+(?:[-\s][A-Za-zА-Яа-яЁё]+)*$/,
  email: /^(?!.*xn--)[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+7\s\(\d{3}\)\s\d{3}-\d{2}-\d{2}$/,
};

export { patterns };
