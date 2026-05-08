import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../../.env') })

const { serve } = await import('@hono/node-server')
const { app } = await import('./app.js')

const port = 3001

serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running at http://localhost:${port}`)
})
