import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import type { Category } from '@shared/types'

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
}

export function useCategories() {
  const { session } = useAuthStore()
  const userId = session?.user?.id

  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId!)
        .order('order', { ascending: true })

      if (error) throw error
      return (data ?? []) as Category[]
    },
    enabled: !!userId,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { session } = useAuthStore()

  return useMutation({
    mutationFn: async (data: { name: string; color: string; icon?: string }) => {
      const { data: cat, error } = await supabase
        .from('categories')
        .insert({
          user_id: session!.user.id,
          name: data.name,
          color: data.color,
          icon: data.icon ?? null,
          order: 99,
        })
        .select()
        .single()

      if (error) throw error
      return cat
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}
