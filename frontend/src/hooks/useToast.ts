import { useState, useCallback } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

let externalAdd: ((toast: Omit<Toast, 'id'>) => void) | null = null;

/**
 * Module-level toast function — usable outside React components.
 * Call toast.success / toast.error etc. from anywhere after <Toaster> mounts.
 */
export const toast = {
  success: (title: string, description?: string) =>
    externalAdd?.({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    externalAdd?.({ title, description, variant: 'error' }),
  info: (title: string, description?: string) =>
    externalAdd?.({ title, description, variant: 'info' }),
  warning: (title: string, description?: string) =>
    externalAdd?.({ title, description, variant: 'warning' }),
};

/** Internal hook used only by <Toaster> to manage state. */
export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  // Register the module-level helper
  externalAdd = add;

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { toasts, remove };
}
