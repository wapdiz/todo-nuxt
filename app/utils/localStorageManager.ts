interface ILS {
  save: (key: string, data: any) => void;
  load: (key: string, value: string, days: number) => string | null;
  clear: (key: string) => void;
}

const localStorageManager: ILS = {
  save: (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  },
  load: (key) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  clear: (key) => {
    localStorage.removeItem(key);
  },
};

export default localStorageManager;
