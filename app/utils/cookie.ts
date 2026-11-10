interface ICookie {
  checkCookie: (name: string) => string | false;
  setCookie: (name: string, value: string, days: number) => void;
  deleteCookie: (name: string) => void;
}

const cookie: ICookie = {
  checkCookie: (name: string) => {
    const cookies = document.cookie;
    const cookieArray = cookies.split('; ').map((cookie) => {
      const [cookieName, cookieValue] = cookie.split('=');
      return { name: cookieName, value: cookieValue };
    });

    const targetCookie = cookieArray.find((cookie) => cookie.name === name);
    return targetCookie?.value || false;
  },

  setCookie: (name: string, value: string, days: number) => {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = `${name}=${value || ''}${expires}; path=/`;
  },

  deleteCookie: (name: string) => {
    if (cookie.checkCookie(name)) {
      document.cookie = `${name}=; Path=/; Max-Age=-1;`;
    }
  },
};

export default cookie;
