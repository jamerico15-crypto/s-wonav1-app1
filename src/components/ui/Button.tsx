import { type ReactNode, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#EE3A25] text-white hover:bg-[#d4321f] shadow-sm focus:ring-[#EE3A25]/30',
  secondary: 'bg-[#711246] text-white hover:bg-[#5e0f3c] shadow-sm focus:ring-[#711246]/30',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white focus:ring-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm focus:ring-red-500/30',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
