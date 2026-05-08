import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max: number
  className?: string
  color?: string
  showLabel?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({
  value,
  max,
  className,
  color = 'bg-primary-500',
  showLabel = false,
  label,
  size = 'md',
}: ProgressBarProps) {
  const pct = max === 0 ? 0 : Math.min((value / max) * 100, 100)

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  }

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">{label}</span>
          <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
            {value} / {max}
          </span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden',
          heights[size]
        )}
      >
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}
