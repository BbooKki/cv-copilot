import type {InputHTMLAttributes, TextareaHTMLAttributes} from 'react';

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {label: string};
type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {label: string};

const inputClass = 'focus-ring w-full border border-white/10 bg-white/[.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-700 hover:border-white/20 focus:border-white/50 disabled:opacity-50';

export function InputField({label, id, className = '', ...props}: InputFieldProps) {
  const fieldId = id ?? props.name;
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[.14em] text-neutral-500">{label}</span>
      <input id={fieldId} className={`${inputClass} ${className}`} {...props} />
    </label>
  );
}

export function TextAreaField({label, id, rows = 3, className = '', ...props}: TextAreaFieldProps) {
  const fieldId = id ?? props.name;
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[.14em] text-neutral-500">{label}</span>
      <textarea id={fieldId} rows={rows} className={`${inputClass} resize-y leading-6 ${className}`} {...props} />
    </label>
  );
}
