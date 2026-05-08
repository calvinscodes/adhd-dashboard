import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/auth'
import { useCreateSubtask } from '@/hooks/useTasks'

interface AIBreakdownPanelProps {
  taskId: string
  taskTitle: string
  categoryName?: string
  existingSubtaskCount: number
}

export function AIBreakdownPanel({
  taskId,
  taskTitle,
  categoryName,
  existingSubtaskCount,
}: AIBreakdownPanelProps) {
  const { session } = useAuthStore()
  const createSubtask = useCreateSubtask()
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'template' | 'ai' | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [accepted, setAccepted] = useState(false)

  const fetchBreakdown = async () => {
    if (!session?.user?.id) return
    setLoading(true)
    setError(null)
    setSuggestions([])
    setSelected(new Set())
    setAccepted(false)

    try {
      const res = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle,
          categoryName: categoryName ?? '',
          userId: session.user.id,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to get breakdown')
      }

      const data = await res.json()
      setSuggestions(data.subtasks ?? [])
      setSource(data.source)
      // Select all by default
      setSelected(new Set(data.subtasks.map((_: string, i: number) => i)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleAccept = async () => {
    const toAdd = suggestions.filter((_, i) => selected.has(i))
    const startOrder = existingSubtaskCount

    await Promise.all(
      toAdd.map((title, i) =>
        createSubtask.mutateAsync({ taskId, title, order: startOrder + i })
      )
    )

    setAccepted(true)
    setSuggestions([])
  }

  if (accepted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 py-3 text-sm text-emerald-600 dark:text-emerald-400"
      >
        <Check size={16} />
        Subtasks added
      </motion.div>
    )
  }

  return (
    <div className="rounded-xl border border-primary-100 dark:border-primary-900/40 bg-primary-50/50 dark:bg-primary-900/10 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles size={15} />
          AI Task Breakdown
          {source === 'template' && (
            <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded">
              Template
            </span>
          )}
        </span>
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4">
              {/* Empty state / trigger */}
              {suggestions.length === 0 && !loading && !error && (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">
                    Let AI break this task into focused subtasks
                  </p>
                  <Button
                    size="sm"
                    onClick={fetchBreakdown}
                    className="gap-2"
                  >
                    <Sparkles size={14} />
                    Break it down
                  </Button>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex items-center gap-2 py-4 justify-center text-sm text-slate-500 dark:text-zinc-400">
                  <Loader2 size={16} className="animate-spin" />
                  Thinking...
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="py-2">
                  <p className="text-xs text-red-500 mb-2">{error}</p>
                  <Button size="sm" variant="secondary" onClick={fetchBreakdown}>
                    Retry
                  </Button>
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-2">
                    Select subtasks to add:
                  </p>
                  {suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => toggleSelect(i)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        selected.has(i)
                          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                          : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          selected.has(i)
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-slate-300 dark:border-zinc-600'
                        }`}
                      >
                        {selected.has(i) && <Check size={10} className="text-white" />}
                      </div>
                      {s}
                    </motion.button>
                  ))}

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleAccept}
                      loading={createSubtask.isPending}
                      disabled={selected.size === 0}
                    >
                      Add {selected.size} subtask{selected.size !== 1 ? 's' : ''}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSuggestions([])}
                    >
                      <X size={14} />
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={fetchBreakdown}
                    >
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
