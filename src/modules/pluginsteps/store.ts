import { create } from 'zustand'

import { type ConnectionTarget, PAGE_CONNECTION } from '@/shared/connections'

import { type StepStateFilter } from './lib'

export interface PluginStepsState {
  connection: ConnectionTarget
  filter: string
  stateFilter: StepStateFilter
  checkedIds: Set<string>
  openItems: string[]
  setConnection: (connection: ConnectionTarget) => void
  setFilter: (filter: string) => void
  setStateFilter: (stateFilter: StepStateFilter) => void
  setChecked: (ids: string[], checked: boolean) => void
  clearChecked: () => void
  setOpenItems: (openItems: string[]) => void
}

export const usePluginStepsStore = create<PluginStepsState>()((set) => ({
  connection: PAGE_CONNECTION,
  filter: '',
  stateFilter: 'all',
  checkedIds: new Set(),
  openItems: [],
  setConnection: (connection) => set({ connection, checkedIds: new Set(), openItems: [] }),
  setFilter: (filter) => set({ filter }),
  setStateFilter: (stateFilter) => set({ stateFilter }),
  setChecked: (ids, checked) =>
    set((state) => {
      const next = new Set(state.checkedIds)
      for (const id of ids) {
        if (checked) {
          next.add(id)
        } else {
          next.delete(id)
        }
      }
      return { checkedIds: next }
    }),
  clearChecked: () => set({ checkedIds: new Set() }),
  setOpenItems: (openItems) => set({ openItems }),
}))
