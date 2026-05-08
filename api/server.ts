// Vercel serverless function — adapts Hono app to Vercel's Node.js runtime
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { app } from '../apps/web/src/server/app'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Reconstruct a proper URL for the Hono fetch handler
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  const url = `${proto}://${host}${req.url}`

  const fetchReq = new Request(url, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.method !== 'GET' && req.method !== 'HEAD'
      ? JSON.stringify(req.body)
      : undefined,
  })

  const honoRes = await app.fetch(fetchReq)

  res.status(honoRes.status)
  honoRes.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  const body = await honoRes.text()
  res.send(body)
}
