import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BarChart2, Layout, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/templates', icon: Layout, label: 'Templates' },
  { to: '/stats', icon: BarChart2, label: 'Stats' },
]

export function MobileNav() {
  const { setQuickAddOpen } = useUIStore()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-zinc-500')
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}

        <button
          onClick={() => setQuickAddOpen(true)}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30 -mt-4"
        >
          <Plus size={22} />
        </button>
      </div>
    </nav>
  )
}
