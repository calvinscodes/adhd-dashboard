import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, Flame, Trophy, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StreakBadge } from '@/components/reward/StreakBadge'
import { calculateLevel, xpForLevel, xpForNextLevel } from '@shared/types'

// Heatmap: past 12 weeks
function useCompletionHeatmap(userId: string | undefined) {
  return useQuery({
    queryKey: ['heatmap', userId],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - 84) // 12 weeks

      const { data } = await supabase
        .from('tasks')
        .select('completed_at')
        .eq('user_id', userId!)
        .eq('status', 'done')
        .gte('completed_at', since.toISOString())

      // Group by date
      const counts: Record<string, number> = {}
      data?.forEach((t) => {
        if (t.completed_at) {
          const d = t.completed_at.split('T')[0]
          counts[d] = (counts[d] ?? 0) + 1
        }
      })
      return counts
    },
    enabled: !!userId,
  })
}

function useXPHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['xp-events', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('xp_events')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(20)
      return data ?? []
    },
    enabled: !!userId,
  })
}

export function StatsPage() {
  const { profile, session } = useAuthStore()
  const { data: heatmap } = useCompletionHeatmap(session?.user?.id)
  const { data: xpEvents } = useXPHistory(session?.user?.id)

  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const xpStart = xpForLevel(level)
  const xpEnd = xpForNextLevel(level)
  const xpProgress = xp - xpStart
  const xpNeeded = xpEnd - xpStart

  // Build heatmap grid (past 12 weeks, Mon–Sun)
  const heatmapDays = useMemo(() => {
    const days: { date: string; count: number }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 83; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().split('T')[0]
      days.push({ date: key, count: heatmap?.[key] ?? 0 })
    }
    return days
  }, [heatmap])

  const maxCount = Math.max(...heatmapDays.map((d) => d.count), 1)

  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-zinc-800'
    const intensity = count / maxCount
    if (intensity < 0.25) return 'bg-primary-200 dark:bg-primary-900/40'
    if (intensity < 0.5) return 'bg-primary-400 dark:bg-primary-700'
    if (intensity < 0.75) return 'bg-primary-500 dark:bg-primary-600'
    return 'bg-primary-600 dark:bg-primary-400'
  }

  // Stats summary
  const totalCompleted = Object.values(heatmap ?? {}).reduce((a, b) => a + b, 0)
  const activeDays = Object.keys(heatmap ?? {}).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart2 size={20} className="text-primary-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Stats</h1>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Your progress, at a glance</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{level}</div>
          <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Level</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{xp}</div>
          <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Total XP</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-orange-500">{profile?.streak_count ?? 0}</div>
          <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Day streak</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalCompleted}
          </div>
          <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Completed (12w)</div>
        </div>
      </div>

      {/* XP progress */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Level progress</h2>
          <span className="ml-auto text-xs text-slate-400 dark:text-zinc-500">
            Level {level} → {level + 1}
          </span>
        </div>
        <ProgressBar
          value={xpProgress}
          max={xpNeeded}
          size="lg"
          label={`${xpProgress} / ${xpNeeded} XP`}
          showLabel
        />
      </div>

      {/* Streak */}
      {profile && profile.streak_count > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-orange-500 fill-orange-400" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                Current streak
              </h2>
            </div>
            <StreakBadge streak={profile.streak_count} size="lg" />
          </div>
          {profile.last_active_date && (
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">
              Last active:{' '}
              {new Date(profile.last_active_date).toLocaleDateString('en-AU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </p>
          )}
        </div>
      )}

      {/* Completion heatmap */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-primary-500" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
            Activity heatmap (12 weeks)
          </h2>
          <span className="ml-auto text-xs text-slate-400 dark:text-zinc-500">
            {activeDays} active days
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(12, 1fr)', minWidth: 300 }}>
            {Array.from({ length: 12 }).map((_, week) => (
              <div key={week} className="flex flex-col gap-1">
                {heatmapDays.slice(week * 7, week * 7 + 7).map((day) => (
                  <motion.div
                    key={day.date}
                    title={`${day.date}: ${day.count} task${day.count !== 1 ? 's' : ''}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: week * 0.02 }}
                    className={`w-full aspect-square rounded-sm ${getHeatColor(day.count)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 dark:text-zinc-500">
          <span>Less</span>
          {['bg-slate-100 dark:bg-zinc-800', 'bg-primary-200', 'bg-primary-400', 'bg-primary-500', 'bg-primary-600'].map(
            (cls, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
            )
          )}
          <span>More</span>
        </div>
      </div>

      {/* Recent XP events */}
      {xpEvents && xpEvents.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-3">
            Recent XP earned
          </h2>
          <div className="space-y-2">
            {xpEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-600 dark:text-zinc-400 capitalize">
                  {event.event_type.replace(/_/g, ' ')}
                </span>
                <span className="font-semibold text-primary-600 dark:text-primary-400">
                  +{event.xp_delta} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
