export const useSocialNames = () => {
  const getSocialName = (name: string) => {
    const socialNames: Record<string, string> = {
      vk: 'ВКонтакте',
      fb: 'Facebook',
      ok: 'Одноклассники',
      tg: 'Telegram',
    };
    return socialNames[name] || 'Социальная сеть';
  };

  return { getSocialName };
};
