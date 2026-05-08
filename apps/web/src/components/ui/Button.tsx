import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed select-none'

    const variants = {
      primary:
        'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white focus:ring-primary-400',
      secondary:
        'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:active:bg-zinc-600 text-slate-700 dark:text-zinc-300 focus:ring-slate-300 dark:focus:ring-zinc-600',
      ghost:
        'hover:bg-slate-100 active:bg-slate-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 text-slate-600 dark:text-zinc-400 focus:ring-slate-200',
      danger:
        'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white focus:ring-red-400',
    }

    const sizes = {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-sm px-4 py-2',
      lg: 'text-base px-6 py-3',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
