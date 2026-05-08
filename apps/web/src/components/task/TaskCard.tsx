import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ChevronRight, Calendar, Flag, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatDate, isOverdue, getPriorityBadgeClass } from '@/lib/utils'
import { useCompleteTask, useUncompleteTask, useToggleSubtask } from '@/hooks/useTasks'
import { Badge } from '@/components/ui/Badge'
import type { Task } from '@shared/types'

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const navigate = useNavigate()
  const completeTask = useCompleteTask()
  const uncompleteTask = useUncompleteTask()
  const toggleSubtask = useToggleSubtask()
  const isDone = task.status === 'done'
  const hasSubtasks = (task.subtasks?.length ?? 0) > 0
  const sortedSubtasks = [...(task.subtasks ?? [])].sort((a, b) => a.order - b.order)
  const doneSubtasks = sortedSubtasks.filter((s) => s.status === 'done').length
  const totalSubtasks = sortedSubtasks.length
  const isPending = completeTask.isPending || uncompleteTask.isPending
  const [subtasksOpen, setSubtasksOpen] = useState(true)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPending) return
    if (isDone) uncompleteTask.mutate(task.id)
    else completeTask.mutate({ taskId: task.id, hasSubtasks })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={cn('card p-4 cursor-pointer hover:shadow-md transition-shadow duration-150 group', isDone && 'opacity-60')}
    >
      <div className="flex items-start gap-3" onClick={() => navigate(`/task/${task.id}`)}>
        {/* Checkbox */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleToggle}
          disabled={isPending}
          className="mt-0.5 shrink-0 focus:outline-none"
        >
          <motion.div
            animate={isDone ? { scale: [0.8, 1.2, 1.0] } : { scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {isDone
              ? <CheckCircle2 size={20} className="text-emerald-500" />
              : <Circle size={20} className={cn('text-slate-300 dark:text-zinc-600 group-hover:text-primary-400 transition-colors', isPending && 'animate-pulse')} />
            }
          </motion.div>
        </motion.button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm font-medium text-slate-800 dark:text-zinc-200 leading-snug', isDone && 'line-through text-slate-400 dark:text-zinc-600')}>
              {task.title}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              {hasSubtasks && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSubtasksOpen((v) => !v) }}
                  className="p-0.5 rounded text-slate-300 dark:text-zinc-600 hover:text-slate-500 dark:hover:text-zinc-400 transition-colors"
                >
                  {subtasksOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
              <ChevronRight size={15} className="text-slate-300 dark:text-zinc-600 group-hover:text-slate-500 transition-colors" />
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center flex-wrap gap-2 mt-1.5">
            {task.category && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.category.color }} />
                {task.category.name}
              </span>
            )}
            <Badge className={getPriorityBadgeClass(task.priority)}>
              <Flag size={10} />{task.priority}
            </Badge>
            {task.due_date && (
              <span className={cn('inline-flex items-center gap-1 text-xs', isOverdue(task.due_date) && !isDone ? 'text-red-500' : 'text-slate-400 dark:text-zinc-500')}>
                <Calendar size={11} />{formatDate(task.due_date)}
              </span>
            )}
            {hasSubtasks && (
              <span className="text-xs text-slate-400 dark:text-zinc-500">{doneSubtasks}/{totalSubtasks} done</span>
            )}
          </div>
        </div>
      </div>

      {/* Subtask progress bar */}
      {hasSubtasks && totalSubtasks > 0 && (
        <div className="mt-2 ml-8">
          <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary-400"
              initial={{ width: 0 }}
              animate={{ width: `${(doneSubtasks / totalSubtasks) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      )}

      {/* Inline subtasks */}
      <AnimatePresence>
        {hasSubtasks && subtasksOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-8 mt-2 space-y-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {sortedSubtasks.map((sub) => {
              const subDone = sub.status === 'done'
              return (
                <motion.div
                  key={sub.id}
                  layout
                  className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/60 group/sub cursor-pointer"
                  onClick={() => toggleSubtask.mutate({ subtaskId: sub.id, taskId: task.id, currentStatus: sub.status })}
                >
                  <motion.div whileTap={{ scale: 0.8 }}>
                    {subDone
                      ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      : <Circle size={15} className="text-slate-300 dark:text-zinc-600 group-hover/sub:text-primary-400 transition-colors shrink-0" />
                    }
                  </motion.div>
                  <span className={cn('text-xs text-slate-600 dark:text-zinc-400', subDone && 'line-through text-slate-400 dark:text-zinc-600')}>
                    {sub.title}
                  </span>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
