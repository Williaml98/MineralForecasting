'use client';

import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastState, type Toast } from '@/hooks/useToast';

const config: Record<
  Toast['variant'],
  { icon: React.ElementType; bg: string; border: string; title: string; icon_color: string }
> = {
  success: {
    icon: CheckCircle,
    bg: 'bg-white',
    border: 'border-l-4 border-l-green-500',
    title: 'text-gray-900',
    icon_color: 'text-green-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-white',
    border: 'border-l-4 border-l-red-500',
    title: 'text-gray-900',
    icon_color: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-white',
    border: 'border-l-4 border-l-amber-500',
    title: 'text-gray-900',
    icon_color: 'text-amber-500',
  },
  info: {
    icon: Info,
    bg: 'bg-white',
    border: 'border-l-4 border-l-blue-500',
    title: 'text-gray-900',
    icon_color: 'text-blue-500',
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const c = config[toast.variant];
  const Icon = c.icon;

  return (
    <div
      className={`flex items-start gap-3 w-80 p-4 rounded-lg shadow-lg border border-gray-100 ${c.bg} ${c.border} animate-slide-in`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${c.icon_color}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${c.title}`}>{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-gray-500 mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, remove } = useToastState();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={() => remove(t.id)} />
        </div>
      ))}
    </div>
  );
}
