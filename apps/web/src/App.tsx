import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'

// Lazy-loaded pages
const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const CategoryPage = lazy(() => import('@/pages/CategoryPage').then((m) => ({ default: m.CategoryPage })))
const TaskDetailPage = lazy(() => import('@/pages/TaskDetailPage').then((m) => ({ default: m.TaskDetailPage })))
const BrainDumpPage = lazy(() => import('@/pages/BrainDumpPage').then((m) => ({ default: m.BrainDumpPage })))
const TemplatesPage = lazy(() => import('@/pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })))
const StatsPage = lazy(() => import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 dark:text-zinc-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="category/:id" element={<CategoryPage />} />
          <Route path="task/:id" element={<TaskDetailPage />} />
          <Route path="brain-dump" element={<BrainDumpPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="stats" element={<StatsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
