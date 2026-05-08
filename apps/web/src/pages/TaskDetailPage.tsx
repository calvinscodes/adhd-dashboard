import { useState, useEffect, useRef } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Flag,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
} from 'lucide-react'
import { useTask, useUpdateTask, useCompleteTask, useDeleteTask, useCreateSubtask } from '@/hooks/useTasks'
import { useAuthStore } from '@/store/auth'
import { SubtaskItem } from '@/components/task/SubtaskItem'
import { AIBreakdownPanel } from '@/components/task/AIBreakdownPanel'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { useCategories } from '@/hooks/useCategories'
import { formatDate, isOverdue, getPriorityBadgeClass } from '@/lib/utils'

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: task, isLoading } = useTask(id!)
  const { data: categories } = useCategories()
  const updateTask = useUpdateTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()
  const createSubtask = useCreateSubtask()

  const { session } = useAuthStore()
  const memoryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced memory sync — fires 3s after subtasks stop changing
  useEffect(() => {
    if (!task?.subtasks || !task.title || !session?.user?.id) return
    if (memoryTimer.current) clearTimeout(memoryTimer.current)
    memoryTimer.current = setTimeout(() => {
      const subtaskTitles = task.subtasks!
        .sort((a, b) => a.order - b.order)
        .map((s) => s.title)
      fetch('/api/ai/update-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, taskTitle: task.title, subtasks: subtaskTitles }),
      }).catch(() => {}) // silent — memory update is non-critical
    }, 3000)
    return () => { if (memoryTimer.current) clearTimeout(memoryTimer.current) }
  }, [task?.subtasks, task?.title, session?.user?.id])

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPriority, setEditPriority] = useState('medium')
  const [editCategory, setEditCategory] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [newSubtask, setNewSubtask] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)

  if (!id) return <Navigate to="/" />

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="card h-32 animate-pulse bg-slate-100 dark:bg-zinc-800" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 dark:text-zinc-500">Task not found</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
          Go back
        </Button>
      </div>
    )
  }

  const isDone = task.status === 'done'
  const hasSubtasks = (task.subtasks?.length ?? 0) > 0
  const category = categories?.find((c) => c.id === task.category_id)

  const startEditing = () => {
    setEditTitle(task.title)
    setEditDesc(task.description ?? '')
    setEditPriority(task.priority)
    setEditCategory(task.category_id ?? '')
    setEditDueDate(task.due_date ?? '')
    setEditing(true)
  }

  const saveEdit = async () => {
    await updateTask.mutateAsync({
      id: task.id,
      title: editTitle.trim() || task.title,
      description: editDesc.trim() || null,
      priority: editPriority as 'low' | 'medium' | 'high',
      category_id: editCategory || null,
      due_date: editDueDate || null,
    })
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return
    await deleteTask.mutateAsync(task.id)
    navigate(-1)
  }

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubtask.trim()) return
    await createSubtask.mutateAsync({
      taskId: task.id,
      title: newSubtask.trim(),
      order: task.subtasks?.length ?? 0,
    })
    setNewSubtask('')
    setAddingSubtask(false)
  }

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...(categories?.map((c) => ({ value: c.id, label: c.name })) ?? []),
  ]

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Main card */}
      <div className="card p-5">
        {editing ? (
          <div className="space-y-4">
            <Input
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              label="Description"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              placeholder="Add some context..."
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category"
                options={categoryOptions}
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              />
              <Select
                label="Priority"
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
              />
            </div>
            <Input
              label="Due date"
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={saveEdit} loading={updateTask.isPending} size="sm">
                <Save size={14} />
                Save
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)} size="sm">
                <X size={14} />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <motion.div
                  animate={isDone ? { scale: [0.8, 1.2, 1.0] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isDone ? (
                    <CheckCircle2 size={22} className="text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-zinc-600 mt-0.5 shrink-0" />
                  )}
                </motion.div>
                <h1
                  className={`text-lg font-semibold text-slate-900 dark:text-zinc-100 leading-snug ${isDone ? 'line-through text-slate-400 dark:text-zinc-600' : ''}`}
                >
                  {task.title}
                </h1>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={startEditing} className="p-2">
                  <Edit2 size={15} />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="p-2 hover:text-red-500">
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center flex-wrap gap-2 mb-3">
              {category && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </span>
              )}
              <Badge className={getPriorityBadgeClass(task.priority)}>
                <Flag size={10} />
                {task.priority}
              </Badge>
              {task.due_date && (
                <span
                  className={`inline-flex items-center gap-1 text-xs ${
                    isOverdue(task.due_date) && !isDone
                      ? 'text-red-500'
                      : 'text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  <Calendar size={11} />
                  {formatDate(task.due_date)}
                </span>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-slate-600 dark:text-zinc-400 mb-4 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Complete button */}
            {!isDone && (
              <Button
                onClick={() =>
                  completeTask.mutate({ taskId: task.id, hasSubtasks })
                }
                loading={completeTask.isPending}
                size="sm"
                className="gap-1.5"
              >
                <CheckCircle2 size={15} />
                Mark complete
              </Button>
            )}
          </>
        )}
      </div>

      {/* Subtasks */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
            Subtasks {hasSubtasks && `(${task.subtasks?.filter((s) => s.status === 'done').length}/${task.subtasks?.length})`}
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAddingSubtask(true)}
            className="gap-1 p-1"
          >
            <Plus size={15} />
            Add
          </Button>
        </div>

        {/* Subtask list */}
        <div className="space-y-0.5">
          <AnimatePresence mode="popLayout">
            {task.subtasks
              ?.sort((a, b) => a.order - b.order)
              .map((subtask) => (
                <SubtaskItem key={subtask.id} subtask={subtask} taskId={task.id} />
              ))}
          </AnimatePresence>
        </div>

        {/* Add subtask form */}
        <AnimatePresence>
          {addingSubtask && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddSubtask}
              className="flex gap-2 mt-3"
            >
              <Input
                placeholder="Add a subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                autoFocus
                className="flex-1"
              />
              <Button type="submit" size="sm" loading={createSubtask.isPending}>
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAddingSubtask(false)
                  setNewSubtask('')
                }}
              >
                <X size={14} />
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* AI Breakdown */}
      {!isDone && (
        <AIBreakdownPanel
          taskId={task.id}
          taskTitle={task.title}
          categoryName={category?.name}
          existingSubtaskCount={task.subtasks?.length ?? 0}
        />
      )}
    </div>
  )
}
