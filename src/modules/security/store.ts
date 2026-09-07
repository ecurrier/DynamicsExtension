import { create } from 'zustand'

import { type ConnectionTarget, PAGE_CONNECTION } from '@/shared/connections'
import { type SystemUser } from '@/shared/types'

interface StagedRoles {
  key: string
  roleIds: string[]
}

export interface SecurityState {
  connection: ConnectionTarget
  selectedBusinessUnitId: string | null
  selectedUser: SystemUser | null
  searchResults: SystemUser[]
  staged: StagedRoles | null
  setConnection: (connection: ConnectionTarget) => void
  setBusinessUnit: (businessUnitId: string | null) => void
  setSearchResults: (users: SystemUser[]) => void
  selectUser: (user: SystemUser | null) => void
  setStaged: (key: string, roleIds: string[]) => void
  clearStaged: () => void
}

export const useSecurityStore = create<SecurityState>()((set) => ({
  connection: PAGE_CONNECTION,
  selectedBusinessUnitId: null,
  selectedUser: null,
  searchResults: [],
  staged: null,
  setConnection: (connection) =>
    set({ connection, selectedBusinessUnitId: null, selectedUser: null, searchResults: [], staged: null }),
  setBusinessUnit: (selectedBusinessUnitId) => set({ selectedBusinessUnitId, staged: null }),
  setSearchResults: (searchResults) => set({ searchResults }),
  selectUser: (selectedUser) => set({ selectedUser, staged: null }),
  setStaged: (key, roleIds) => set({ staged: { key, roleIds } }),
  clearStaged: () => set({ staged: null }),
}))
