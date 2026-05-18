import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export function AuthButton({ children, variant = 'primary', loading = false, className = '', disabled, ...props }: AuthButtonProps) {
  const baseClasses = `
    w-full h-12 rounded-lg font-body text-sm font-semibold
    transition-all duration-200 flex items-center justify-center gap-2
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-deep-slate
  `;

  const variantClasses = variant === 'primary'
    ? 'bg-mint-precision text-deep-slate hover:bg-white focus:ring-mint-precision/50 active:scale-[0.98] disabled:bg-mint-precision/30 disabled:text-deep-slate/50 disabled:cursor-not-allowed'
    : 'bg-surface-panel text-text-primary border border-border-tech hover:border-text-secondary/50 hover:bg-surface-panel/60 focus:ring-mint-precision/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Procesando...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
