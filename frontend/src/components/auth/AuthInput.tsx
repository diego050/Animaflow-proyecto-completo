import { forwardRef, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon: Icon, error, type = 'text', className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className="space-y-1.5">
        <label className="block text-text-secondary text-sm font-medium font-body">{label}</label>
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50 pointer-events-none">
              <Icon size={18} strokeWidth={1.5} />
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full h-12 rounded-lg bg-[#0b101a] border font-body text-sm text-text-primary
              placeholder:text-text-secondary/40 placeholder:text-sm
              transition-all duration-200 outline-none
              ${Icon ? 'pl-10' : 'pl-4'}
              ${isPassword ? 'pr-12' : 'pr-4'}
              ${error
                ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
                : 'border-border-tech focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 hover:border-text-secondary/50'
              }
              ${className}
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/50 hover:text-text-secondary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
            </button>
          )}
        </div>
        {error && <p className="text-error text-xs font-body mt-1">{error}</p>}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
