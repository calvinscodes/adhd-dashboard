import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { aiRoutes } from './routes/ai'
import { xpRoutes } from './routes/xp'

export const app = new Hono()

app.use('*', cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }))
app.use('*', logger())

app.get('/api/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }))

app.route('/api/ai', aiRoutes)
app.route('/api/xp', xpRoutes)

export default app
