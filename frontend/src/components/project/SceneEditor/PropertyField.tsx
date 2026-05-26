import { useCallback } from 'react';

interface PropertyFieldProps {
  label: string;
  type: 'number' | 'text' | 'color' | 'select' | 'range';
  value: unknown;
  onChange: (value: unknown) => void;
  options?: Array<{ value: unknown; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function PropertyField({
  label,
  type,
  value,
  onChange,
  options = [],
  min,
  max,
  step,
  suffix,
}: PropertyFieldProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let newValue: unknown = e.target.value;
      if (type === 'number' || type === 'range') {
        newValue = parseFloat(e.target.value);
      }
      onChange(newValue);
    },
    [type, onChange],
  );

  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-xs text-text-secondary/60 shrink-0">{label}</label>
      <div className="flex items-center gap-1.5 flex-1 justify-end">
        {type === 'select' ? (
          <select
            value={String(value)}
            onChange={handleChange}
            className="bg-surface-lowest border border-border-tech rounded px-2 py-1 text-xs text-text-primary focus:border-mint-precision outline-none"
          >
            {options.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : type === 'color' ? (
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={value as string}
              onChange={handleChange}
              className="w-6 h-6 rounded cursor-pointer border-0 p-0"
            />
            <span className="text-[10px] font-mono text-text-secondary/50">
              {value as string}
            </span>
          </div>
        ) : type === 'range' ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="range"
              value={value as number}
              onChange={handleChange}
              min={min}
              max={max}
              step={step}
              className="flex-1 accent-mint-precision"
            />
            <span className="text-[10px] font-mono text-text-secondary/50 w-12 text-right">
              {typeof value === 'number'
                ? step && step < 1
                  ? value.toFixed(2)
                  : String(value)
                : String(value)}
              {suffix || ''}
            </span>
          </div>
        ) : (
          <input
            type={type}
            value={value as string | number}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            className="w-20 bg-surface-lowest border border-border-tech rounded px-2 py-1 text-xs text-text-primary focus:border-mint-precision outline-none text-right"
          />
        )}
      </div>
    </div>
  );
}
