import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function isToday(date: string | Date | null): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'text-red-500'
    case 'medium':
      return 'text-amber-500'
    case 'low':
      return 'text-emerald-500'
    default:
      return 'text-slate-400'
  }
}

export function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'medium':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'low':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}
