import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase-admin'
import { levenshtein } from '../lib/utils'

export const aiRoutes = new Hono()

async function askGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq error: ${res.status} — ${text}`)
  }

  const data = await res.json() as { choices: [{ message: { content: string } }] }
  return data.choices[0].message.content
}

aiRoutes.post('/breakdown', async (c) => {
  try {
    const body = await c.req.json()
    const { taskTitle, categoryName, userId } = body as {
      taskTitle: string
      categoryName: string
      userId: string
    }

    if (!taskTitle || !userId) {
      return c.json({ error: 'taskTitle and userId are required' }, 400)
    }

    // 1. Fuzzy match against task_templates (Levenshtein ≤ 3)
    const { data: templates } = await supabaseAdmin
      .from('task_templates')
      .select('*, template_subtasks(*)')
      .eq('user_id', userId)

    if (templates && templates.length > 0) {
      const titleLower = taskTitle.toLowerCase()
      const matched = templates.find((t) => {
        const dist = levenshtein(titleLower, t.name_pattern.toLowerCase())
        return dist <= 3
      })

      if (matched) {
        const subtasks = (matched.template_subtasks ?? [])
          .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
          .map((s: { title: string }) => s.title)

        return c.json({ subtasks, source: 'template', templateId: matched.id })
      }
    }

    // 2. Fetch recent similar tasks for context
    const { data: recentTasks } = await supabaseAdmin
      .from('tasks')
      .select('title, subtasks(*)')
      .eq('user_id', userId)
      .eq('status', 'done')
      .order('completed_at', { ascending: false })
      .limit(10)

    const relevantTasks = recentTasks?.filter((t) =>
      t.title.toLowerCase().includes(categoryName?.toLowerCase() ?? '') ||
      (categoryName ?? '').toLowerCase().includes(t.title.toLowerCase().split(' ')[0])
    ).slice(0, 5) ?? []

    const contextTasks = relevantTasks.length > 0 ? relevantTasks : (recentTasks ?? []).slice(0, 5)

    const examplesText = contextTasks.length > 0
      ? contextTasks.map((t) => {
          const subs = ((t.subtasks as { title: string }[]) ?? []).map((s) => `  - ${s.title}`).join('\n')
          return `Task: "${t.title}"\nSubtasks:\n${subs || '  (none)'}`
        }).join('\n\n')
      : 'No prior task history available.'

    // 3. Call Ollama
    const prompt = `You are a helpful ADHD task coach. Break down the following task into 3-6 focused, concrete, actionable subtasks that are easy to start and complete one at a time.

Task: "${taskTitle}"
Category: ${categoryName || 'General'}

Here are some examples of how the user has broken down similar tasks before:
${examplesText}

Return ONLY a JSON array of strings, with each string being one subtask. No explanation, no markdown, just the JSON array.
Example output: ["Review the requirements", "Set up the project folder", "Write the first draft", "Review and edit"]

Your response (JSON array only):`

    const responseText = await askGroq(prompt)

    let subtasks: string[] = []
    try {
      const stripped = responseText.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
      const match = stripped.match(/\[[\s\S]*\]/)
      subtasks = JSON.parse(match ? match[0] : stripped)
    } catch {
      subtasks = responseText
        .split('\n')
        .map((s) => s.replace(/^[-*\d.)\s`]+/, '').trim())
        .filter((s) => s.length > 0 && !s.startsWith('{') && !s.startsWith('['))
        .slice(0, 6)
    }

    if (!Array.isArray(subtasks) || subtasks.length === 0) {
      return c.json({ error: 'Failed to parse subtask suggestions' }, 500)
    }

    subtasks = subtasks.slice(0, 6)

    // 4. Persist as template for future fuzzy matching
    try {
      const { data: newTemplate } = await supabaseAdmin
        .from('task_templates')
        .insert({ user_id: userId, name_pattern: taskTitle.toLowerCase() })
        .select()
        .single()

      if (newTemplate) {
        await supabaseAdmin.from('template_subtasks').insert(
          subtasks.map((title, i) => ({ template_id: newTemplate.id, title, order: i }))
        )
      }
    } catch (templateErr) {
      console.error('Failed to save template:', templateErr)
    }

    return c.json({ subtasks, source: 'ai' })
  } catch (err) {
    console.error('AI breakdown error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

aiRoutes.post('/update-memory', async (c) => {
  try {
    const { userId, taskTitle, subtasks } = await c.req.json() as {
      userId: string
      taskTitle: string
      subtasks: string[]
    }

    if (!userId || !taskTitle || !Array.isArray(subtasks)) {
      return c.json({ error: 'userId, taskTitle and subtasks are required' }, 400)
    }

    const pattern = taskTitle.toLowerCase().trim()

    // Find existing template with exact pattern match
    const { data: existing } = await supabaseAdmin
      .from('task_templates')
      .select('id')
      .eq('user_id', userId)
      .eq('name_pattern', pattern)
      .single()

    let templateId: string

    if (existing) {
      templateId = existing.id
      // Delete old subtasks and replace with current ones
      await supabaseAdmin.from('template_subtasks').delete().eq('template_id', templateId)
    } else {
      const { data: newTemplate, error } = await supabaseAdmin
        .from('task_templates')
        .insert({ user_id: userId, name_pattern: pattern })
        .select('id')
        .single()

      if (error || !newTemplate) return c.json({ error: 'Failed to create template' }, 500)
      templateId = newTemplate.id
    }

    if (subtasks.length > 0) {
      await supabaseAdmin.from('template_subtasks').insert(
        subtasks.map((title, i) => ({ template_id: templateId, title, order: i }))
      )
    }

    return c.json({ ok: true })
  } catch (err) {
    console.error('Memory update error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

aiRoutes.post('/parse-brain-dump', async (c) => {
  try {
    const { text, userId } = await c.req.json() as { text: string; userId: string }

    if (!text?.trim() || !userId) {
      return c.json({ error: 'text and userId are required' }, 400)
    }

    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('user_id', userId)

    const categoryList = (categories ?? []).map((cat) => cat.name).join(', ')
    const today = new Date().toISOString().split('T')[0]

    const prompt = `You are an ADHD task coach. Parse the following brain dump text and extract every distinct task mentioned. For each task, generate focused subtasks and assign it to the most appropriate category.

Today's date is ${today}.

Available categories: ${categoryList || 'Work, Personal, Projects'}

Brain dump text:
"""
${text}
"""

Rules:
- Extract every distinct task, project, or to-do mentioned
- Generate 2-5 concrete, actionable subtasks per task
- Assign each task to the most relevant available category
- Infer due dates from relative language ("tomorrow", "today", "next week") — use ISO format (YYYY-MM-DD). If no date is mentioned, use today's date.
- Keep task titles short and clear (under 60 chars)
- Keep subtask titles short and actionable

Return ONLY a valid JSON array. No explanation, no markdown, no code fences. Start your response with [ and end with ].

Example:
[
  {
    "title": "Edit main video for Courtney Caulfield",
    "categoryName": "Work",
    "dueDate": "${today}",
    "subtasks": ["Cut and sync footage", "Add colour grade", "Export final file"]
  }
]`

    const responseText = await askGroq(prompt)

    let tasks: Array<{ title: string; categoryName: string; dueDate: string; subtasks: string[] }> = []
    try {
      // Strip markdown code fences if present
      const stripped = responseText.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
      const match = stripped.match(/\[[\s\S]*\]/)
      tasks = JSON.parse(match ? match[0] : stripped)
    } catch {
      console.error('Raw Ollama response:', responseText)
      return c.json({ error: 'Failed to parse AI response' }, 500)
    }

    const tasksWithIds = tasks.map((task) => {
      const cat = (categories ?? []).find(
        (cat) => cat.name.toLowerCase() === task.categoryName.toLowerCase()
      )
      return { ...task, categoryId: cat?.id ?? null }
    })

    return c.json({ tasks: tasksWithIds })
  } catch (err) {
    console.error('Brain dump parse error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})
