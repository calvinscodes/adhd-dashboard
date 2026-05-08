import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, X, Check, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useCategories } from '@/hooks/useCategories'
import { useQueryClient } from '@tanstack/react-query'
import { taskKeys } from '@/hooks/useTasks'
import { Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ParsedTask {
  title: string
  categoryName: string
  categoryId: string | null
  dueDate: string
  subtasks: string[]
  expanded: boolean
  excluded: boolean
}

export function BrainDumpPage() {
  const { session } = useAuthStore()
  const { data: categories } = useCategories()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [creating, setCreating] = useState(false)
  const [createdCount, setCreatedCount] = useState<number | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    supabase
      .from('brain_dump')
      .select('content, updated_at')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setContent(data.content ?? '')
          setLastSaved(data.updated_at ? new Date(data.updated_at) : null)
        }
      })
  }, [userId])

  const save = useCallback(
    async (text: string) => {
      if (!userId) return
      setSaving(true)
      const now = new Date().toISOString()
      await supabase.from('brain_dump').update({ content: text, updated_at: now }).eq('user_id', userId)
      setLastSaved(new Date(now))
      setSaving(false)
    },
    [userId]
  )

  const handleChange = (text: string) => {
    setContent(text)
    setParsedTasks([])
    setCreatedCount(null)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(text), 1200)
  }

  const handleParse = async () => {
    if (!content.trim() || !userId) return
    setParsing(true)
    setParsedTasks([])
    setCreatedCount(null)
    try {
      const res = await fetch('/api/ai/parse-brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, userId }),
      })
      const data = await res.json()
      if (data.tasks) {
        setParsedTasks(data.tasks.map((t: Omit<ParsedTask, 'expanded' | 'excluded'>) => ({
          ...t,
          expanded: true,
          excluded: false,
        })))
      }
    } catch (err) {
      console.error('Parse error:', err)
    } finally {
      setParsing(false)
    }
  }

  const handleCreateAll = async () => {
    if (!userId) return
    setCreating(true)
    const toCreate = parsedTasks.filter((t) => !t.excluded)
    let count = 0

    for (const task of toCreate) {
      const { data: newTask } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: task.title,
          category_id: task.categoryId ?? null,
          due_date: task.dueDate || null,
          status: 'todo',
          priority: 'medium',
        })
        .select()
        .single()

      if (newTask && task.subtasks.length > 0) {
        await supabase.from('subtasks').insert(
          task.subtasks.map((title, i) => ({
            task_id: newTask.id,
            title,
            order: i,
            status: 'todo',
          }))
        )
      }
      count++
    }

    queryClient.invalidateQueries({ queryKey: taskKeys.all })
    setCreatedCount(count)
    setParsedTasks([])
    setCreating(false)
  }

  const updateTask = (index: number, patch: Partial<ParsedTask>) => {
    setParsedTasks((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  }

  const removeSubtask = (taskIndex: number, subtaskIndex: number) => {
    setParsedTasks((prev) =>
      prev.map((t, i) =>
        i === taskIndex ? { ...t, subtasks: t.subtasks.filter((_, si) => si !== subtaskIndex) } : t
      )
    )
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const activeCount = parsedTasks.filter((t) => !t.excluded).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-amber-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Brain Dump</h1>
            <p className="text-xs text-slate-400 dark:text-zinc-500">Just write — AI will sort it out</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-slate-400 dark:text-zinc-500">
              {saving ? 'Saving...' : `Saved ${lastSaved.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          )}
          <Button
            size="sm"
            onClick={handleParse}
            disabled={!content.trim() || parsing}
            className="gap-1.5"
          >
            {parsing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {parsing ? 'Parsing...' : 'Parse into tasks'}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="card p-1">
        <Textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Dump everything here...\n\nExample: "Today I need to do a 60 second main video and coming soon reel for Courtney Caulfield and deliver it tomorrow. I also have to do those render animations for Lachie (20 left)..."\n\nThen hit "Parse into tasks" and AI will split it up for you.`}
          className="min-h-[35vh] border-0 focus:ring-0 text-base leading-relaxed resize-none bg-transparent p-4"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
              e.preventDefault()
              save(content)
            }
          }}
        />
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-zinc-500">
        <span>{wordCount} words</span>
        <span>{content.length} characters</span>
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {createdCount !== null && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium"
          >
            <Check size={16} />
            {createdCount} task{createdCount !== 1 ? 's' : ''} created successfully
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parsed tasks review */}
      <AnimatePresence>
        {parsedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                Review — {activeCount} task{activeCount !== 1 ? 's' : ''} found
              </h2>
              <Button
                size="sm"
                onClick={handleCreateAll}
                disabled={creating || activeCount === 0}
                className="gap-1.5"
              >
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {creating ? 'Creating...' : `Create ${activeCount} task${activeCount !== 1 ? 's' : ''}`}
              </Button>
            </div>

            {parsedTasks.map((task, i) => (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: task.excluded ? 0.4 : 1, y: 0 }}
                className={cn('card p-4 space-y-3', task.excluded && 'opacity-40')}
              >
                {/* Task header */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input
                      className="w-full text-sm font-medium bg-transparent text-slate-800 dark:text-zinc-200 border-b border-transparent hover:border-slate-200 dark:hover:border-zinc-700 focus:border-primary-400 outline-none pb-0.5 transition-colors"
                      value={task.title}
                      onChange={(e) => updateTask(i, { title: e.target.value })}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Category select */}
                      <select
                        value={task.categoryId ?? ''}
                        onChange={(e) => {
                          const cat = categories?.find((c) => c.id === e.target.value)
                          updateTask(i, { categoryId: e.target.value || null, categoryName: cat?.name ?? '' })
                        }}
                        className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-0 outline-none cursor-pointer"
                      >
                        <option value="">No category</option>
                        {categories?.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {/* Due date */}
                      <input
                        type="date"
                        value={task.dueDate}
                        onChange={(e) => updateTask(i, { dueDate: e.target.value })}
                        className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-0 outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateTask(i, { expanded: !task.expanded })}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      {task.expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    <button
                      onClick={() => updateTask(i, { excluded: !task.excluded })}
                      className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                      title={task.excluded ? 'Include' : 'Exclude'}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Subtasks */}
                <AnimatePresence>
                  {task.expanded && task.subtasks.length > 0 && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 pl-2 border-l-2 border-slate-100 dark:border-zinc-800"
                    >
                      {task.subtasks.map((sub, si) => (
                        <li key={si} className="flex items-center gap-2 group">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600 shrink-0" />
                          <input
                            className="flex-1 text-xs bg-transparent text-slate-600 dark:text-zinc-400 border-b border-transparent hover:border-slate-200 dark:hover:border-zinc-700 focus:border-primary-400 outline-none py-0.5 transition-colors"
                            value={sub}
                            onChange={(e) => {
                              const newSubs = [...task.subtasks]
                              newSubs[si] = e.target.value
                              updateTask(i, { subtasks: newSubs })
                            }}
                          />
                          <button
                            onClick={() => removeSubtask(i, si)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={11} />
                          </button>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
