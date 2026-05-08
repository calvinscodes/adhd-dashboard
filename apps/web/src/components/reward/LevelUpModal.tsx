import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/ui'
import { useEffect } from 'react'
import { fireLevelUp } from '@/lib/confetti'

export function LevelUpModal() {
  const { levelUpModal, hideLevelUp } = useUIStore()

  useEffect(() => {
    if (levelUpModal.show) {
      fireLevelUp()
    }
  }, [levelUpModal.show])

  return (
    <Modal open={levelUpModal.show} onClose={hideLevelUp} size="sm">
      <div className="text-center py-2">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-400/40"
        >
          <Trophy size={32} className="text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-xs font-semibold text-primary-500 uppercase tracking-widest mb-1">
            Level Up!
          </p>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-zinc-100 mb-1">
            Level {levelUpModal.newLevel}
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
            +{levelUpModal.xpGained} XP earned — you're on fire!
          </p>

          <div className="flex items-center justify-center gap-3 mb-6 text-sm">
            <div className="text-slate-400 dark:text-zinc-500 line-through">
              Lv {levelUpModal.oldLevel}
            </div>
            <div className="text-2xl">→</div>
            <div className="font-bold text-primary-600 dark:text-primary-400">
              Lv {levelUpModal.newLevel}
            </div>
          </div>

          <Button onClick={hideLevelUp} className="w-full">
            Keep going!
          </Button>
        </motion.div>
      </div>
    </Modal>
  )
}
