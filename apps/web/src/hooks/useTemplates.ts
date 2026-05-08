import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import type { TaskTemplate } from '@shared/types'

export const templateKeys = {
  all: ['templates'] as const,
  list: () => [...templateKeys.all, 'list'] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
}

export function useTemplates() {
  const { session } = useAuthStore()
  const userId = session?.user?.id

  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*, template_subtasks(*), category:categories(*)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as (TaskTemplate & { template_subtasks: { id: string; title: string; order: number }[] })[]
    },
    enabled: !!userId,
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      name_pattern,
      subtasks,
    }: {
      id: string
      name_pattern: string
      subtasks: string[]
    }) => {
      // Update template name
      const { error: nameErr } = await supabase
        .from('task_templates')
        .update({ name_pattern })
        .eq('id', id)

      if (nameErr) throw nameErr

      // Delete old subtasks
      await supabase.from('template_subtasks').delete().eq('template_id', id)

      // Insert new subtasks
      if (subtasks.length > 0) {
        const { error: subErr } = await supabase.from('template_subtasks').insert(
          subtasks.map((title, i) => ({ template_id: id, title, order: i }))
        )
        if (subErr) throw subErr
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}
