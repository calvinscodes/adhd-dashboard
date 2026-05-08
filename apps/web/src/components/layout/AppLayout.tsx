import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { LevelUpModal } from '@/components/reward/LevelUpModal'
import { QuickAddModal } from '@/components/task/QuickAddModal'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
          <Outlet />
        </div>
      </main>

      <MobileNav />
      <LevelUpModal />
      <QuickAddModal />
    </div>
  )
}
