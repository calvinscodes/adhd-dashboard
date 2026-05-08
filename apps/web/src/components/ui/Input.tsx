import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full px-3 py-2 bg-white dark:bg-zinc-800 border rounded-lg text-slate-900 dark:text-zinc-100',
          'placeholder-slate-400 dark:placeholder-zinc-500',
          'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent',
          'transition-all duration-150 text-sm',
          error
            ? 'border-red-400 dark:border-red-500'
            : 'border-slate-200 dark:border-zinc-700',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full px-3 py-2 bg-white dark:bg-zinc-800 border rounded-lg text-slate-900 dark:text-zinc-100',
            'placeholder-slate-400 dark:placeholder-zinc-500',
            'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent',
            'transition-all duration-150 text-sm resize-none',
            error
              ? 'border-red-400 dark:border-red-500'
              : 'border-slate-200 dark:border-zinc-700',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Input, Textarea }
