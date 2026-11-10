type TSubmitCallback<T> = (values: T) => Promise<void> | void;

interface UseBaseFormReturn<T> {
  onSubmit: (values: T, helpers: { resetForm: () => void }) => Promise<void>;
  onInvalidSubmit: (ctx: any) => void;
}

interface UseBaseFormOptions<T> {
  initialValues: T;
  onSubmit: TSubmitCallback<T>;
  onError?: ErrorCallback;
}

export const useBaseForm = <T extends Record<string, any>>(options: UseBaseFormOptions<T>): UseBaseFormReturn<T> => {
  const onInvalidSubmit = (ctx: any) => {
    const elements = ctx.evt?.srcElement?.elements ?? [];

    for (let i = 0; i < elements.length; i++) {
      if (elements[i].classList.contains('error')) {
        elements[i].focus();
        break;
      }
    }
  };

  const onSubmit = async (values: T, { resetForm }: { resetForm: () => void }) => {
    try {
      await options.onSubmit(values);
      resetForm();
    } catch (error: any) {
      options.onError?.(error);
    }
  };

  return {
    onSubmit,
    onInvalidSubmit,
  };
};

export default useBaseForm;
