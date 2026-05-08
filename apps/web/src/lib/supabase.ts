import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          xp: number
          level: number
          streak_count: number
          last_active_date: string | null
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'xp' | 'level' | 'streak_count'>
        Update: Partial<Database['public']['Tables']['users']['Row']>
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          icon: string | null
          order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['categories']['Row']>
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'done'
          priority: 'low' | 'medium' | 'high'
          due_date: string | null
          template_id: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'completed_at'>
        Update: Partial<Database['public']['Tables']['tasks']['Row']>
      }
      subtasks: {
        Row: {
          id: string
          task_id: string
          title: string
          status: 'todo' | 'done'
          order: number
          created_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['subtasks']['Row'], 'id' | 'created_at' | 'completed_at'>
        Update: Partial<Database['public']['Tables']['subtasks']['Row']>
      }
      task_templates: {
        Row: {
          id: string
          user_id: string
          name_pattern: string
          category_id: string | null
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['task_templates']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['task_templates']['Row']>
      }
      template_subtasks: {
        Row: {
          id: string
          template_id: string
          title: string
          order: number
        }
        Insert: Omit<Database['public']['Tables']['template_subtasks']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['template_subtasks']['Row']>
      }
      xp_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          xp_delta: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['xp_events']['Row'], 'id' | 'created_at'>
        Update: never
      }
      brain_dump: {
        Row: {
          id: string
          user_id: string
          content: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['brain_dump']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['brain_dump']['Row']>
      }
    }
  }
}
