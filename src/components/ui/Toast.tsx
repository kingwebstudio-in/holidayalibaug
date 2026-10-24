import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-xl border backdrop-blur-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-[#092D28] text-white border-[#D8AD57]/40'
              : toast.type === 'error'
              ? 'bg-[#451212] text-white border-red-500/40'
              : 'bg-[#123B33] text-white border-white/20'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#D8AD57] shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold tracking-wide">{toast.title}</h4>
            {toast.message && <p className="text-xs text-white/80 mt-1 leading-relaxed">{toast.message}</p>}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-white/60 hover:text-white p-1 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
