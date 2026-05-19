import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../store/useToastStore';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const toastStyles = {
  error: 'bg-error/10 border-error/30 text-error',
  warning: 'bg-cadmium-orange/10 border-cadmium-orange/30 text-cadmium-orange',
  success: 'bg-mint-precision/10 border-mint-precision/30 text-mint-precision',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

const toastIcons = {
  error: AlertTriangle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-md ${toastStyles[toast.type]}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Cerrar notificación"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
