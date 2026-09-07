import { create } from 'zustand'

import { lastVisitedAreaItem } from '@/shared/storage'

export interface NavigationState {
  currentAreaId: string
  drawerOpen: boolean
  navigate: (areaId: string) => void
  setDrawerOpen: (open: boolean) => void
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  currentAreaId: '',
  drawerOpen: false,
  navigate: (areaId) => {
    set({ currentAreaId: areaId, drawerOpen: false })
    void lastVisitedAreaItem.setValue(areaId)
  },
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
}))
