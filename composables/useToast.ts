export const useToast = () => {
  const toasts = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
  }>>('toasts', () => []);

  const addToast = (
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    title?: string,
    duration = 4000
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    toasts.value.push({ id, type, title, message });

    if (duration > 0) {
      setTimeout(() => {
        const index = toasts.value.findIndex(t => t.id === id);
        if (index > -1) {
          toasts.value.splice(index, 1);
        }
      }, duration);
    }

    return id;
  };

  const success = (message: string, title?: string) => addToast('success', message, title);
  const error = (message: string, title?: string) => addToast('error', message, title);
  const warning = (message: string, title?: string) => addToast('warning', message, title);
  const info = (message: string, title?: string) => addToast('info', message, title);

  return {
    success,
    error,
    warning,
    info,
  };
};
