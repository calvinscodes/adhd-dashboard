import { create } from 'zustand'

interface LevelUpModal {
  show: boolean
  oldLevel: number
  newLevel: number
  xpGained: number
}

interface QuickAddDefaults {
  categoryId?: string
  dueDate?: string
}

interface UIState {
  levelUpModal: LevelUpModal
  showLevelUp: (oldLevel: number, newLevel: number, xpGained: number) => void
  hideLevelUp: () => void
  quickAddOpen: boolean
  quickAddDefaults: QuickAddDefaults
  setQuickAddOpen: (open: boolean, defaults?: QuickAddDefaults) => void
}

export const useUIStore = create<UIState>((set) => ({
  levelUpModal: { show: false, oldLevel: 1, newLevel: 1, xpGained: 0 },

  showLevelUp: (oldLevel, newLevel, xpGained) =>
    set({ levelUpModal: { show: true, oldLevel, newLevel, xpGained } }),

  hideLevelUp: () =>
    set({ levelUpModal: { show: false, oldLevel: 1, newLevel: 1, xpGained: 0 } }),

  quickAddOpen: false,
  quickAddDefaults: {},
  setQuickAddOpen: (open, defaults = {}) => set({ quickAddOpen: open, quickAddDefaults: defaults }),
}))
