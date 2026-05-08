import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Mail, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function AuthPage() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setSending(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    setSending(false)

    if (error) {
      setError(error.message)
    } else {
      setSubmitted(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30">
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">ADHD Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Focused. Rewarding. Yours.</p>
        </div>

        <div className="card p-6">
          {!submitted ? (
            <>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-1">
                Sign in
              </h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-5">
                We'll send you a magic link — no password needed.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                  error={error ?? undefined}
                />

                <Button type="submit" loading={sending} className="w-full gap-2">
                  <Mail size={16} />
                  Send magic link
                </Button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-zinc-100 mb-1">Check your inbox</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                We sent a magic link to <strong>{email}</strong>. Click it to sign in.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false)
                  setEmail('')
                }}
                className="mt-4 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 underline"
              >
                Use a different email
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
