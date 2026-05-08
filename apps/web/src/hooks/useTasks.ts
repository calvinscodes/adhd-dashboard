import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { fireTaskComplete } from '@/lib/confetti'
import type { Task, Subtask, XPAwardResult } from '@shared/types'

// ─── Query keys ─────────────────────────────────────────────────────────────

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...taskKeys.lists(), filters] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
  today: () => [...taskKeys.all, 'today'] as const,
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

async function fetchTasks(userId: string, categoryId?: string): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*, category:categories(*), subtasks(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Task[]
}

async function fetchTask(taskId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, category:categories(*), subtasks(*)')
    .eq('id', taskId)
    .single()

  if (error) throw error
  const task = data as Task & { subtasks: Subtask[] }
  if (task?.subtasks) {
    task.subtasks = task.subtasks.sort((a, b) => a.order - b.order)
  }
  return task
}

async function fetchTodayTasks(userId: string): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('tasks')
    .select('*, category:categories(*), subtasks(*)')
    .eq('user_id', userId)
    .or(`due_date.eq.${today},created_at.gte.${today}T00:00:00`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Task[]
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useTasks(categoryId?: string) {
  const { session } = useAuthStore()
  const userId = session?.user?.id

  return useQuery({
    queryKey: taskKeys.list({ categoryId }),
    queryFn: () => fetchTasks(userId!, categoryId),
    enabled: !!userId,
  })
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => fetchTask(taskId),
    enabled: !!taskId,
  })
}

export function useTodayTasks() {
  const { session } = useAuthStore()
  const userId = session?.user?.id

  return useQuery({
    queryKey: taskKeys.today(),
    queryFn: () => fetchTodayTasks(userId!),
    enabled: !!userId,
  })
}

// ─── XP Award ────────────────────────────────────────────────────────────────

async function awardXP(userId: string, taskId: string, hasSubtasks: boolean, isEarly: boolean): Promise<XPAwardResult> {
  const res = await fetch('/api/xp/award', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, taskId, hasSubtasks, isEarly }),
  })
  if (!res.ok) throw new Error('Failed to award XP')
  return res.json()
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateTask() {
  const queryClient = useQueryClient()
  const { session } = useAuthStore()

  return useMutation({
    mutationFn: async (data: {
      title: string
      description?: string
      category_id?: string
      priority?: string
      due_date?: string
    }) => {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          user_id: session!.user.id,
          title: data.title,
          description: data.description ?? null,
          category_id: data.category_id ?? null,
          priority: (data.priority as 'low' | 'medium' | 'high') ?? 'medium',
          due_date: data.due_date ?? null,
          status: 'todo',
        })
        .select()
        .single()

      if (error) throw error
      return task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) })
    },
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()
  const { session, profile, fetchProfile } = useAuthStore()
  const { showLevelUp } = useUIStore()

  return useMutation({
    mutationFn: async ({ taskId, hasSubtasks }: { taskId: string; hasSubtasks: boolean }) => {
      const now = new Date().toISOString()

      // Get task to check due_date
      const { data: task } = await supabase
        .from('tasks')
        .select('due_date')
        .eq('id', taskId)
        .single()

      const isEarly =
        task?.due_date != null && new Date(task.due_date) >= new Date(new Date().toISOString().split('T')[0])

      // Mark task done
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done', completed_at: now })
        .eq('id', taskId)

      if (error) throw error

      // Award XP
      const xpResult = await awardXP(session!.user.id, taskId, hasSubtasks, isEarly)

      return { xpResult, taskId }
    },
    onSuccess: ({ xpResult }) => {
      fireTaskComplete()
      queryClient.invalidateQueries({ queryKey: taskKeys.all })

      if (xpResult.leveledUp) {
        showLevelUp(xpResult.oldLevel, xpResult.newLevel, xpResult.xpGained)
      }

      // Refresh profile
      if (session?.user?.id) {
        fetchProfile(session.user.id)
      }
    },
  })
}

export function useUncompleteTask() {
  const queryClient = useQueryClient()
  const { session, fetchProfile } = useAuthStore()

  return useMutation({
    mutationFn: async (taskId: string) => {
      // Reverse XP before resetting status (task still has completed_at at this point)
      await fetch('/api/xp/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session!.user.id, taskId }),
      })

      const { error } = await supabase
        .from('tasks')
        .update({ status: 'todo', completed_at: null })
        .eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      if (session?.user?.id) fetchProfile(session.user.id)
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

// ─── Subtask mutations ───────────────────────────────────────────────────────

export function useCreateSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, title, order }: { taskId: string; title: string; order: number }) => {
      const { data, error } = await supabase
        .from('subtasks')
        .insert({ task_id: taskId, title, order, status: 'todo' })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useToggleSubtask() {
  const queryClient = useQueryClient()
  const { session, fetchProfile } = useAuthStore()
  const { showLevelUp } = useUIStore()

  return useMutation({
    mutationFn: async ({
      subtaskId,
      taskId,
      currentStatus,
    }: {
      subtaskId: string
      taskId: string
      currentStatus: 'todo' | 'done'
    }) => {
      const newStatus = currentStatus === 'done' ? 'todo' : 'done'
      const now = new Date().toISOString()

      const { error } = await supabase
        .from('subtasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'done' ? now : null,
        })
        .eq('id', subtaskId)

      if (error) throw error

      // Check if all subtasks are done → auto-complete task
      if (newStatus === 'done') {
        const { data: allSubtasks } = await supabase
          .from('subtasks')
          .select('status')
          .eq('task_id', taskId)

        const allDone = allSubtasks?.every((s) => s.status === 'done') ?? false

        if (allDone) {
          const { data: task } = await supabase
            .from('tasks')
            .select('due_date, status')
            .eq('id', taskId)
            .single()

          if (task && task.status !== 'done') {
            const isEarly =
              task.due_date != null &&
              new Date(task.due_date) >= new Date(new Date().toISOString().split('T')[0])

            await supabase
              .from('tasks')
              .update({ status: 'done', completed_at: now })
              .eq('id', taskId)

            const xpResult = await awardXP(session!.user.id, taskId, true, isEarly)
            return { allDone: true, xpResult }
          }
        }
      }

      return { allDone: false, xpResult: null }
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.all })

      if (result.allDone && result.xpResult) {
        fireTaskComplete()
        if (result.xpResult.leveledUp) {
          showLevelUp(result.xpResult.oldLevel, result.xpResult.newLevel, result.xpResult.xpGained)
        }
        if (session?.user?.id) {
          fetchProfile(session.user.id)
        }
      }
    },
  })
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ subtaskId, taskId }: { subtaskId: string; taskId: string }) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}
