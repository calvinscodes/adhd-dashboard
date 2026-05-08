import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layout, Trash2, Edit2, ChevronDown, ChevronUp, Plus, Save, X } from 'lucide-react'
import { useTemplates, useDeleteTemplate, useUpdateTemplate } from '@/hooks/useTemplates'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates()
  const deleteTemplate = useDeleteTemplate()
  const updateTemplate = useUpdateTemplate()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSubtasks, setEditSubtasks] = useState<string[]>([])

  const startEdit = (id: string, name: string, subtasks: string[]) => {
    setEditingId(id)
    setEditName(name)
    setEditSubtasks(subtasks)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditSubtasks([])
  }

  const saveEdit = async (id: string) => {
    await updateTemplate.mutateAsync({
      id,
      name_pattern: editName.trim(),
      subtasks: editSubtasks.filter((s) => s.trim()),
    })
    cancelEdit()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Layout size={20} className="text-purple-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Templates</h1>
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            Reusable subtask patterns — created manually or learned by AI
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="card h-16 animate-pulse bg-slate-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : templates?.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate-400 dark:text-zinc-500 text-sm">
            No templates yet. Complete tasks with AI-suggested subtasks and they'll appear here.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {templates?.map((template) => {
              const isExpanded = expandedId === template.id
              const isEditing = editingId === template.id
              const subtasks = template.template_subtasks?.sort((a, b) => a.order - b.order) ?? []

              return (
                <motion.div
                  key={template.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="card overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : template.id)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">
                          {template.name_pattern}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                          {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1.5"
                        onClick={() => {
                          setExpandedId(template.id)
                          startEdit(
                            template.id,
                            template.name_pattern,
                            subtasks.map((s) => s.title)
                          )
                        }}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1.5 hover:text-red-500"
                        onClick={() => {
                          if (confirm('Delete this template?'))
                            deleteTemplate.mutate(template.id)
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : template.id)}
                        className="p-1 text-slate-400 dark:text-zinc-500"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded — subtasks list or edit form */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100 dark:border-zinc-800"
                      >
                        {isEditing ? (
                          <div className="p-4 space-y-3">
                            <Input
                              label="Template name pattern"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              autoFocus
                            />
                            <div className="space-y-2">
                              <label className="label">Subtasks</label>
                              {editSubtasks.map((s, i) => (
                                <div key={i} className="flex gap-2">
                                  <Input
                                    value={s}
                                    onChange={(e) => {
                                      const next = [...editSubtasks]
                                      next[i] = e.target.value
                                      setEditSubtasks(next)
                                    }}
                                    placeholder={`Subtask ${i + 1}`}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setEditSubtasks(editSubtasks.filter((_, j) => j !== i))
                                    }
                                    className="shrink-0 hover:text-red-500"
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditSubtasks([...editSubtasks, ''])}
                                className="gap-1"
                              >
                                <Plus size={13} />
                                Add subtask
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveEdit(template.id)}
                                loading={updateTemplate.isPending}
                              >
                                <Save size={13} />
                                Save
                              </Button>
                              <Button size="sm" variant="secondary" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <ul className="px-4 py-3 space-y-1.5">
                            {subtasks.map((s, i) => (
                              <li
                                key={s.id}
                                className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400"
                              >
                                <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-xs text-slate-400 dark:text-zinc-500 shrink-0">
                                  {i + 1}
                                </span>
                                {s.title}
                              </li>
                            ))}
                          </ul>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
