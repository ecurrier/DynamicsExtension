import { create } from 'zustand'

import { lastVisitedAreaItem } from '@/shared/storage'
import { type WorkspaceLaunch } from '@/shared/types'

export interface NavigationState {
  currentAreaId: string
  drawerOpen: boolean
  workspace: WorkspaceLaunch | null
  navigate: (areaId: string) => void
  setDrawerOpen: (open: boolean) => void
  openWorkspace: (workspace: WorkspaceLaunch) => void
  closeWorkspace: () => void
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  currentAreaId: '',
  drawerOpen: false,
  workspace: null,
  navigate: (areaId) => {
    set({ currentAreaId: areaId, drawerOpen: false, workspace: null })
    void lastVisitedAreaItem.setValue(areaId)
  },
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  openWorkspace: (workspace) => set({ workspace, drawerOpen: false }),
  closeWorkspace: () => set({ workspace: null }),
}))
