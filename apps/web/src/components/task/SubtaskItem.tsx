import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToggleSubtask, useDeleteSubtask } from '@/hooks/useTasks'
import { fireSubtaskComplete } from '@/lib/confetti'
import type { Subtask } from '@shared/types'

interface SubtaskItemProps {
  subtask: Subtask
  taskId: string
}

export function SubtaskItem({ subtask, taskId }: SubtaskItemProps) {
  const toggleSubtask = useToggleSubtask()
  const deleteSubtask = useDeleteSubtask()
  const [hovered, setHovered] = useState(false)
  const isDone = subtask.status === 'done'

  const handleToggle = () => {
    toggleSubtask.mutate({
      subtaskId: subtask.id,
      taskId,
      currentStatus: subtask.status,
    })
    if (subtask.status === 'todo') {
      fireSubtaskComplete()
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 4 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'flex items-center gap-3 py-2 px-3 rounded-lg group transition-colors',
        'hover:bg-slate-50 dark:hover:bg-zinc-800/60',
        isDone && 'opacity-60'
      )}
    >
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={handleToggle}
        disabled={toggleSubtask.isPending}
        className="shrink-0 focus:outline-none"
      >
        <motion.div
          animate={isDone ? { scale: [0.8, 1.2, 1.0] } : { scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          {isDone ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <Circle
              size={18}
              className="text-slate-300 dark:text-zinc-600 group-hover:text-primary-400 transition-colors"
            />
          )}
        </motion.div>
      </motion.button>

      <span
        className={cn(
          'flex-1 text-sm text-slate-700 dark:text-zinc-300',
          isDone && 'line-through text-slate-400 dark:text-zinc-600'
        )}
      >
        {subtask.title}
      </span>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        onClick={() => deleteSubtask.mutate({ subtaskId: subtask.id, taskId })}
        className="shrink-0 text-slate-300 dark:text-zinc-600 hover:text-red-500 transition-colors p-1 rounded"
      >
        <Trash2 size={14} />
      </motion.button>
    </motion.div>
  )
}
