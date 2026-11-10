import { ref, type Ref } from 'vue';

export interface UseCounterReturn {
  count: Ref<number>;
  increment: () => void;
  decrement: () => void;
  double: () => void;
  reset: () => void;
}

export function useCounter(initialValue: number = 0): UseCounterReturn {
  const count = ref<number>(initialValue);

  const increment = (): void => {
    count.value += 1;
  };

  const decrement = (): void => {
    count.value -= 1;
  };

  const double = (): void => {
    count.value *= 2;
  };

  const reset = (): void => {
    count.value = initialValue;
  };

  return {
    count,
    increment,
    decrement,
    double,
    reset,
  };
}
