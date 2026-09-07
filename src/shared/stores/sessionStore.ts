import { create } from 'zustand'

export type BridgeStatus = 'pending' | 'ready' | 'unavailable'

export interface SessionState {
  tabId: number | null
  tabUrl: string | null
  bridgeStatus: BridgeStatus
  setTab: (tabId: number | null, tabUrl: string | null) => void
  setBridgeStatus: (bridgeStatus: BridgeStatus) => void
}

export const useSessionStore = create<SessionState>()((set) => ({
  tabId: null,
  tabUrl: null,
  bridgeStatus: 'pending',
  setTab: (tabId, tabUrl) => set({ tabId, tabUrl }),
  setBridgeStatus: (bridgeStatus) => set({ bridgeStatus }),
}))
