import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface SocialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

export function SocialButton({ icon, label, className = '', ...props }: SocialButtonProps) {
  return (
    <button
      type="button"
      className={`
        flex-1 h-12 rounded-lg bg-[#0b101a] border border-border-tech
        text-text-secondary text-sm font-body font-medium
        flex items-center justify-center gap-2.5
        hover:border-text-secondary/50 hover:bg-surface-panel/50 hover:text-text-primary
        transition-all duration-200 active:scale-[0.98]
        ${className}
      `}
      {...props}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
