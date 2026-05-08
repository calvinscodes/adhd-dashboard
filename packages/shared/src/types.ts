// Shared TypeScript types for the ADHD Dashboard

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type SubtaskStatus = 'todo' | 'done'

export interface User {
  id: string
  email: string
  xp: number
  level: number
  streak_count: number
  last_active_date: string | null
}

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  icon: string | null
  order: number
}

export interface Task {
  id: string
  user_id: string
  category_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  template_id: string | null
  created_at: string
  completed_at: string | null
  // Joined fields
  category?: Category
  subtasks?: Subtask[]
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  status: SubtaskStatus
  order: number
  created_at: string
  completed_at: string | null
}

export interface TaskTemplate {
  id: string
  user_id: string
  name_pattern: string
  category_id: string | null
  description: string | null
  created_at: string
  template_subtasks?: TemplateSubtask[]
}

export interface TemplateSubtask {
  id: string
  template_id: string
  title: string
  order: number
}

export interface XPEvent {
  id: string
  user_id: string
  event_type: string
  xp_delta: number
  created_at: string
}

// API request/response types

export interface AIBreakdownRequest {
  taskTitle: string
  categoryName: string
  userId: string
}

export interface AIBreakdownResponse {
  subtasks: string[]
  source: 'template' | 'ai' | 'error'
  templateId?: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  category_id?: string
  priority?: TaskPriority
  due_date?: string
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  category_id?: string
  priority?: TaskPriority
  due_date?: string
  status?: TaskStatus
}

export interface XPAwardResult {
  xpGained: number
  newXP: number
  oldLevel: number
  newLevel: number
  leveledUp: boolean
}

// Utility types

export interface DashboardStats {
  todayTotal: number
  todayDone: number
  streak: number
  level: number
  xp: number
  xpForNextLevel: number
}

export const DEFAULT_CATEGORIES = [
  { name: 'Work', color: '#3B82F6', icon: '💼' },
  { name: 'Personal', color: '#22C55E', icon: '🏠' },
  { name: 'Ideas / Brain Dump', color: '#EAB308', icon: '💡' },
  { name: 'Projects', color: '#A855F7', icon: '🚀' },
] as const

// XP and levelling

export function calculateLevel(xp: number): number {
  return Math.floor(1 + Math.sqrt(xp / 50))
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 50
}

export function xpForNextLevel(level: number): number {
  return xpForLevel(level + 1)
}

// Levenshtein distance for template fuzzy matching

export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}
