import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import type { User } from '@shared/types'

interface AuthState {
  session: Session | null
  supabaseUser: SupabaseUser | null
  profile: User | null
  loading: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: User | null) => void
  setLoading: (loading: boolean) => void
  fetchProfile: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  supabaseUser: null,
  profile: null,
  loading: true,

  setSession: (session) =>
    set({ session, supabaseUser: session?.user ?? null }),

  setProfile: (profile) => set({ profile }),

  setLoading: (loading) => set({ loading }),

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      set({ profile: data as User })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, supabaseUser: null, profile: null })
  },
}))
