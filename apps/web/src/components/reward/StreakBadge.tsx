import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'

interface StreakBadgeProps {
  streak: number
  size?: 'sm' | 'md' | 'lg'
}

export function StreakBadge({ streak, size = 'md' }: StreakBadgeProps) {
  if (streak === 0) return null

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  }

  const iconSizes = {
    sm: 12,
    md: 15,
    lg: 18,
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center font-semibold rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 ${sizeClasses[size]}`}
    >
      <motion.div
        animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
        transition={{ duration: 0.5, delay: 0.3, ease: 'easeInOut' }}
      >
        <Flame size={iconSizes[size]} className="fill-orange-400 dark:fill-orange-500" />
      </motion.div>
      {streak} day{streak !== 1 ? 's' : ''}
    </motion.div>
  )
}
