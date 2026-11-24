import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types/inventory';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifikasi sistem"
      className="no-print fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const borderColor = isSuccess
          ? 'border-emerald-200 bg-white'
          : isError
            ? 'border-red-200 bg-white'
            : 'border-slate-200 bg-white';
        const iconColor = isSuccess
          ? 'text-emerald-600'
          : isError
            ? 'text-red-600'
            : 'text-blue-700';

        return (
          <div
            key={toast.id}
            role="status"
            className={`flex items-start gap-3 rounded-lg border p-3.5 shadow-sm transition-opacity duration-150 ${borderColor}`}
          >
            <span className={`mt-0.5 shrink-0 ${iconColor}`} aria-hidden="true">
              {isSuccess ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : isError ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label={`Tutup notifikasi ${toast.title}`}
              className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
