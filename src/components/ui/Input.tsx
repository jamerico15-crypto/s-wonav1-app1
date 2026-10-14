import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <input
        className={`w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#EE3A25]/20 focus:border-[#EE3A25] placeholder:text-slate-400 ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, className = '', children, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <select
        className={`w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#EE3A25]/20 focus:border-[#EE3A25] bg-white ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        className={`w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#EE3A25]/20 focus:border-[#EE3A25] placeholder:text-slate-400 ${className}`}
        {...props}
      />
    </div>
  );
}
