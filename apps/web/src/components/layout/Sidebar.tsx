import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Zap,
  BarChart2,
  Layout,
  LogOut,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategories } from '@/hooks/useCategories'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/templates', icon: Layout, label: 'Templates' },
  { to: '/stats', icon: BarChart2, label: 'Stats' },
]

export function Sidebar() {
  const { data: categories } = useCategories()
  const { profile, signOut } = useAuthStore()
  const { setQuickAddOpen } = useUIStore()
  const navigate = useNavigate()

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen bg-white dark:bg-zinc-900 border-r border-slate-100 dark:border-zinc-800 py-4">
      {/* Logo */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">ADHD Dashboard</span>
        </div>
      </div>

      {/* Quick Add */}
      <div className="px-3 mb-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setQuickAddOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Quick Add Task
        </motion.button>
      </div>

      {/* Main nav */}
      <nav className="px-3 space-y-0.5 mb-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100'
              )
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div className="px-3 mb-4">
          <p className="px-3 mb-1.5 text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">
            Categories
          </p>
          <div className="space-y-0.5">
            {categories.map((cat) => (
              <NavLink
                key={cat.id}
                to={`/category/${cat.id}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100'
                  )
                }
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User / sign out */}
      {profile && (
        <div className="px-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                {profile.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-zinc-300 truncate">
                {profile.email}
              </p>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                Lv {profile.level} · {profile.xp} XP
              </p>
            </div>
            <button
              onClick={() => {
                signOut()
                navigate('/auth')
              }}
              className="btn-ghost p-1 shrink-0"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
