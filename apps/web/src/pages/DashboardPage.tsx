import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Sparkles, Loader2, X, Check, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useTasks, taskKeys } from '@/hooks/useTasks'
import { useCategories } from '@/hooks/useCategories'
import { useAuthStore } from '@/store/auth'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { TaskCard } from '@/components/task/TaskCard'
import { StreakBadge } from '@/components/reward/StreakBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { calculateLevel, xpForLevel, xpForNextLevel } from '@shared/types'

interface ParsedTask {
  title: string
  categoryName: string
  categoryId: string | null
  dueDate: string
  subtasks: string[]
  expanded: boolean
  excluded: boolean
}

export function DashboardPage() {
  const { profile, session } = useAuthStore()
  const { data: allTasks, isLoading } = useTasks()
  const { data: categories } = useCategories()
  const queryClient = useQueryClient()

  const [dumpText, setDumpText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createdCount, setCreatedCount] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const userId = session?.user?.id

  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const xpStart = xpForLevel(level)
  const xpEnd = xpForNextLevel(level)
  const xpProgress = xp - xpStart
  const xpNeeded = xpEnd - xpStart

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const firstName = profile?.email.split('@')[0] ?? 'there'

  // Group tasks by category
  const grouped = (categories ?? []).map((cat) => ({
    category: cat,
    pending: (allTasks ?? []).filter((t) => t.category_id === cat.id && t.status !== 'done'),
    done: (allTasks ?? []).filter((t) => t.category_id === cat.id && t.status === 'done'),
  })).filter((g) => g.pending.length > 0 || g.done.length > 0)

  const uncategorisedPending = (allTasks ?? []).filter((t) => !t.category_id && t.status !== 'done')
  const uncategorisedDone = (allTasks ?? []).filter((t) => !t.category_id && t.status === 'done')

  const totalTasks = allTasks?.length ?? 0
  const doneTasks = allTasks?.filter((t) => t.status === 'done').length ?? 0

  // Auto-grow textarea
  const handleDumpChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDumpText(e.target.value)
    setParsedTasks([])
    setParseError(null)
    setCreatedCount(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const clearParsed = () => {
    setParsedTasks([])
    setParseError(null)
  }

  const handleParse = async () => {
    if (!dumpText.trim() || !userId || parsing) return
    setParsing(true)
    setParsedTasks([])
    setParseError(null)
    setCreatedCount(null)
    try {
      const res = await fetch('/api/ai/parse-brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: dumpText, userId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setParseError(data.error ?? 'Something went wrong. Is Ollama running?')
        return
      }
      if (data.tasks?.length) {
        setParsedTasks(data.tasks.map((t: Omit<ParsedTask, 'expanded' | 'excluded'>) => ({
          ...t, expanded: true, excluded: false,
        })))
      } else {
        setParseError('No tasks found — try describing what you need to do in more detail.')
      }
    } catch {
      setParseError('Could not reach the AI server. Make sure Ollama is running (ollama serve).')
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
        .insert({ user_id: userId, title: task.title, category_id: task.categoryId ?? null, due_date: task.dueDate || null, status: 'todo', priority: 'medium' })
        .select().single()
      if (newTask && task.subtasks.length > 0) {
        await supabase.from('subtasks').insert(
          task.subtasks.map((title, i) => ({ task_id: newTask.id, title, order: i, status: 'todo' }))
        )
      }
      count++
    }
    queryClient.invalidateQueries({ queryKey: taskKeys.all })
    setCreatedCount(count)
    setParsedTasks([])
    setDumpText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setCreating(false)
  }

  const updateParsed = (i: number, patch: Partial<ParsedTask>) =>
    setParsedTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))

  const removeSubtask = (ti: number, si: number) =>
    setParsedTasks((prev) => prev.map((t, idx) =>
      idx === ti ? { ...t, subtasks: t.subtasks.filter((_, sIdx) => sIdx !== si) } : t
    ))

  const activeCount = parsedTasks.filter((t) => !t.excluded).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{greeting}, {firstName}</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {profile && <StreakBadge streak={profile.streak_count} />}
      </div>

      {/* XP bar */}
      {profile && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full">
                Level {level}
              </span>
              <span className="text-xs text-slate-400 dark:text-zinc-500">{xp} XP total</span>
            </div>
            <span className="text-xs text-slate-400 dark:text-zinc-500">{xpProgress} / {xpNeeded} XP</span>
          </div>
          <ProgressBar value={xpProgress} max={xpNeeded} color="bg-primary-500" size="sm" />
        </motion.div>
      )}

      {/* Overall progress */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Overall progress</h2>
          <span className="text-xs text-slate-400 dark:text-zinc-500">{doneTasks} of {totalTasks} done</span>
        </div>
        <ProgressBar
          value={doneTasks}
          max={totalTasks || 1}
          size="md"
          color={doneTasks === totalTasks && totalTasks > 0 ? 'bg-emerald-500' : 'bg-primary-500'}
        />
        {doneTasks === totalTasks && totalTasks > 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 size={13} /> All done — you crushed it!
          </motion.p>
        )}
      </div>

      {/* Brain dump input */}
      <div className="card p-3 space-y-2">
        <textarea
          ref={textareaRef}
          value={dumpText}
          onChange={handleDumpChange}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleParse() } }}
          placeholder="Enter new task... (e.g. 'Edit Courtney's video and deliver tomorrow, also finish Lachie's render animations')"
          rows={1}
          className="w-full text-sm text-slate-800 dark:text-zinc-200 bg-transparent placeholder:text-slate-400 dark:placeholder:text-zinc-600 resize-none outline-none leading-relaxed"
        />
        {dumpText.trim() && (
          <div className="flex justify-end">
            <Button size="sm" onClick={handleParse} disabled={parsing} className="gap-1.5">
              {parsing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {parsing ? 'Parsing...' : 'Parse into tasks'}
            </Button>
          </div>
        )}
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {createdCount !== null && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
            <Check size={16} />
            {createdCount} task{createdCount !== 1 ? 's' : ''} created successfully
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      <AnimatePresence>
        {parseError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            <span>{parseError}</span>
            <button onClick={() => setParseError(null)} className="shrink-0 hover:opacity-70"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parsed task review */}
      <AnimatePresence>
        {parsedTasks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                  Review — {activeCount} task{activeCount !== 1 ? 's' : ''} found
                </h2>
                <button onClick={clearParsed} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors">
                  Clear
                </button>
              </div>
              <Button size="sm" onClick={handleCreateAll} disabled={creating || activeCount === 0} className="gap-1.5">
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {creating ? 'Creating...' : `Create ${activeCount} task${activeCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
            {parsedTasks.map((task, i) => (
              <motion.div key={i} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: task.excluded ? 0.4 : 1, y: 0 }} className="card p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input
                      className="w-full text-sm font-medium bg-transparent text-slate-800 dark:text-zinc-200 border-b border-transparent hover:border-slate-200 dark:hover:border-zinc-700 focus:border-primary-400 outline-none pb-0.5 transition-colors"
                      value={task.title}
                      onChange={(e) => updateParsed(i, { title: e.target.value })}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={task.categoryId ?? ''}
                        onChange={(e) => {
                          const cat = categories?.find((c) => c.id === e.target.value)
                          updateParsed(i, { categoryId: e.target.value || null, categoryName: cat?.name ?? '' })
                        }}
                        className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-0 outline-none cursor-pointer"
                      >
                        <option value="">No category</option>
                        {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input
                        type="date"
                        value={task.dueDate}
                        onChange={(e) => updateParsed(i, { dueDate: e.target.value })}
                        className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-0 outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateParsed(i, { expanded: !task.expanded })} className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors">
                      {task.expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    <button onClick={() => updateParsed(i, { excluded: !task.excluded })} className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors">
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {task.expanded && task.subtasks.length > 0 && (
                    <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 pl-2 border-l-2 border-slate-100 dark:border-zinc-800">
                      {task.subtasks.map((sub, si) => (
                        <li key={si} className="flex items-center gap-2 group">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600 shrink-0" />
                          <input
                            className="flex-1 text-xs bg-transparent text-slate-600 dark:text-zinc-400 border-b border-transparent hover:border-slate-200 dark:hover:border-zinc-700 focus:border-primary-400 outline-none py-0.5 transition-colors"
                            value={sub}
                            onChange={(e) => {
                              const newSubs = [...task.subtasks]
                              newSubs[si] = e.target.value
                              updateParsed(i, { subtasks: newSubs })
                            }}
                          />
                          <button onClick={() => removeSubtask(i, si)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-300 hover:text-red-500 transition-all">
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

      {/* Tasks grouped by category */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="card h-16 animate-pulse bg-slate-100 dark:bg-zinc-800" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, pending, done }) => (
            <section key={category.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">{category.name}</h2>
                <span className="text-xs text-slate-400 dark:text-zinc-500">({pending.length} remaining)</span>
              </div>
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {pending.map((task) => <TaskCard key={task.id} task={task} />)}
                  {done.map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </AnimatePresence>
            </section>
          ))}

          {(uncategorisedPending.length > 0 || uncategorisedDone.length > 0) && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 dark:text-zinc-500 mb-3">Uncategorised</h2>
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {uncategorisedPending.map((task) => <TaskCard key={task.id} task={task} />)}
                  {uncategorisedDone.map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </AnimatePresence>
            </section>
          )}

          {totalTasks === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-8 text-center">
              <p className="text-slate-400 dark:text-zinc-500 text-sm">No tasks yet — type something above to get started</p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
