import { useParams, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useCategories } from '@/hooks/useCategories'
import { TaskCard } from '@/components/task/TaskCard'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/ui'

export function CategoryPage() {
  const { id } = useParams<{ id: string }>()
  const { data: categories } = useCategories()
  const { data: tasks, isLoading } = useTasks(id)
  const { setQuickAddOpen } = useUIStore()

  if (!id) return <Navigate to="/" />

  const category = categories?.find((c) => c.id === id)
  const pendingTasks = tasks?.filter((t) => t.status !== 'done') ?? []
  const doneTasks = tasks?.filter((t) => t.status === 'done') ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {category && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
              {category?.name ?? 'Category'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {tasks?.length ?? 0} tasks total
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setQuickAddOpen(true, { categoryId: id })} className="gap-1">
          <Plus size={14} />
          Add task
        </Button>
      </div>

      {/* Tasks */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-16 animate-pulse bg-slate-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        <>
          {pendingTasks.length === 0 && doneTasks.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-slate-400 dark:text-zinc-500 text-sm mb-3">No tasks in this category yet</p>
              <Button size="sm" onClick={() => setQuickAddOpen(true, { categoryId: id })} className="gap-1">
                <Plus size={14} />
                Add first task
              </Button>
            </div>
          ) : (
            <>
              {pendingTasks.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mb-3">
                    To do ({pendingTasks.length})
                  </h2>
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-2">
                      {pendingTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  </AnimatePresence>
                </section>
              )}

              {doneTasks.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-slate-400 dark:text-zinc-500 mb-3">
                    Done ({doneTasks.length})
                  </h2>
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-2">
                      {doneTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  </AnimatePresence>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
