import { create } from 'zustand'

import { type ConnectionTarget, PAGE_CONNECTION } from '@/shared/connections'

export interface InvestigateState {
  connection: ConnectionTarget
  table: string
  recordId: string
  column: string
  scanFlows: boolean
  setConnection: (connection: ConnectionTarget) => void
  setTable: (table: string) => void
  setRecordId: (recordId: string) => void
  setColumn: (column: string) => void
  setScanFlows: (scanFlows: boolean) => void
}

export const useInvestigateStore = create<InvestigateState>()((set) => ({
  connection: PAGE_CONNECTION,
  table: '',
  recordId: '',
  column: '',
  scanFlows: true,
  setConnection: (connection) => set({ connection, column: '' }),
  setTable: (table) => set({ table, column: '' }),
  setRecordId: (recordId) => set({ recordId }),
  setColumn: (column) => set({ column }),
  setScanFlows: (scanFlows) => set({ scanFlows }),
}))
