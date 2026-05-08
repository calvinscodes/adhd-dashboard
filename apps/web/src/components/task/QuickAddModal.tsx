import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useUIStore } from '@/store/ui'
import { useCreateTask } from '@/hooks/useTasks'
import { useCategories } from '@/hooks/useCategories'

const today = () => new Date().toISOString().split('T')[0]

export function QuickAddModal() {
  const { quickAddOpen, quickAddDefaults, setQuickAddOpen } = useUIStore()
  const createTask = useCreateTask()
  const { data: categories } = useCategories()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(quickAddDefaults.categoryId ?? '')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState(quickAddDefaults.dueDate ?? today())

  useEffect(() => {
    if (quickAddOpen) {
      setCategoryId(quickAddDefaults.categoryId ?? '')
      setDueDate(quickAddDefaults.dueDate ?? today())
    }
  }, [quickAddOpen, quickAddDefaults.categoryId, quickAddDefaults.dueDate])

  const close = () => {
    setQuickAddOpen(false)
    setTitle('')
    setDescription('')
    setCategoryId('')
    setPriority('medium')
    setDueDate(today())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      category_id: categoryId || undefined,
      priority,
      due_date: dueDate || undefined,
    })

    close()
  }

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...(categories?.map((c) => ({ value: c.id, label: c.name })) ?? []),
  ]

  return (
    <Modal open={quickAddOpen} onClose={close} title="Add Task" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Task title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />

        <Textarea
          label="Description (optional)"
          placeholder="Any extra context..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
          <Select
            label="Priority"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
        </div>

        <Input
          label="Due date (optional)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <div className="flex gap-2 pt-1">
          <Button type="submit" loading={createTask.isPending} className="flex-1">
            Add Task
          </Button>
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
