import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase-admin'
import { calculateLevel } from '../lib/utils'

export const xpRoutes = new Hono()

xpRoutes.post('/award', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, taskId, hasSubtasks, isEarly } = body as {
      userId: string
      taskId: string
      hasSubtasks: boolean
      isEarly: boolean
    }

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400)
    }

    // Get current user XP
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('xp, level')
      .eq('id', userId)
      .single()

    if (userErr || !user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Calculate XP to award
    let xpGained = hasSubtasks ? 25 : 10
    let eventType = hasSubtasks ? 'task_complete_with_subtasks' : 'task_complete'

    if (isEarly) {
      xpGained += 5
      eventType += '_early'
    }

    const oldXP = user.xp
    const newXP = oldXP + xpGained
    const oldLevel = user.level
    const newLevel = calculateLevel(newXP)

    // Update user XP + level
    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ xp: newXP, level: newLevel })
      .eq('id', userId)

    if (updateErr) {
      return c.json({ error: 'Failed to update XP' }, 500)
    }

    // Log XP event
    await supabaseAdmin.from('xp_events').insert({
      user_id: userId,
      event_type: eventType,
      xp_delta: xpGained,
    })

    // Update streak
    await updateStreak(userId)

    return c.json({
      xpGained,
      newXP,
      oldLevel,
      newLevel,
      leveledUp: newLevel > oldLevel,
    })
  } catch (err) {
    console.error('XP award error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

xpRoutes.post('/reverse', async (c) => {
  try {
    const { userId, taskId } = await c.req.json() as { userId: string; taskId: string }

    if (!userId || !taskId) {
      return c.json({ error: 'userId and taskId are required' }, 400)
    }

    // Fetch task to recalculate what was originally awarded
    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('due_date, completed_at, subtasks(id)')
      .eq('id', taskId)
      .single()

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('xp, level')
      .eq('id', userId)
      .single()

    if (!user) return c.json({ error: 'User not found' }, 404)

    const hasSubtasks = (task?.subtasks?.length ?? 0) > 0
    const isEarly =
      task?.due_date != null &&
      task?.completed_at != null &&
      new Date(task.due_date) >= new Date(task.completed_at.split('T')[0])

    let xpToDeduct = hasSubtasks ? 25 : 10
    if (isEarly) xpToDeduct += 5

    const newXP = Math.max(0, user.xp - xpToDeduct)
    const newLevel = calculateLevel(newXP)

    await supabaseAdmin
      .from('users')
      .update({ xp: newXP, level: newLevel })
      .eq('id', userId)

    await supabaseAdmin.from('xp_events').insert({
      user_id: userId,
      event_type: 'task_uncomplete',
      xp_delta: -xpToDeduct,
    })

    return c.json({ xpDeducted: xpToDeduct, newXP, newLevel })
  } catch (err) {
    console.error('XP reverse error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

async function updateStreak(userId: string) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('last_active_date, streak_count')
    .eq('id', userId)
    .single()

  if (!user) return

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (user.last_active_date === today) {
    // Already counted today
    return
  } else if (user.last_active_date === yesterday) {
    // Consecutive day
    await supabaseAdmin
      .from('users')
      .update({ streak_count: (user.streak_count ?? 0) + 1, last_active_date: today })
      .eq('id', userId)
  } else {
    // Gap or first time — reset to 1
    await supabaseAdmin
      .from('users')
      .update({ streak_count: 1, last_active_date: today })
      .eq('id', userId)
  }
}
