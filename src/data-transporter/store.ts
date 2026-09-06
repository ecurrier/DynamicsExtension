import { create } from 'zustand'

import { type ConnectionTarget } from '@/shared/connections'
import { type EntitySummary, type TransportRow } from '@/shared/types'

import { DEFAULT_PLAN_OPTIONS, type PlanOptions, type RunItemResult, type TransportPlan } from './lib'

export type TransporterStep = 'connections' | 'query' | 'plan' | 'run'

export const MAX_ROW_OPTIONS: readonly number[] = [500, 2000, 5000, 20000]

export interface RunProgress {
  done: number
  total: number
}

export interface TransporterState {
  step: TransporterStep
  source: ConnectionTarget | null
  targetEnvironmentId: string | null
  entity: EntitySummary | null
  viewId: string | null
  fetchXml: string
  maxRows: number
  sourceRows: TransportRow[]
  sourceTruncated: boolean
  options: PlanOptions
  selectedFields: Set<string> | null
  plan: TransportPlan | null
  results: RunItemResult[]
  progress: RunProgress | null
  running: boolean
  setStep: (step: TransporterStep) => void
  setSource: (source: ConnectionTarget | null) => void
  setTarget: (targetEnvironmentId: string | null) => void
  setEntity: (entity: EntitySummary | null) => void
  setView: (viewId: string | null, fetchXml: string) => void
  setFetchXml: (fetchXml: string) => void
  setMaxRows: (maxRows: number) => void
  setSourceRows: (sourceRows: TransportRow[], sourceTruncated: boolean) => void
  setOptions: (options: PlanOptions) => void
  setSelectedFields: (selectedFields: Set<string> | null) => void
  setPlan: (plan: TransportPlan | null) => void
  startRun: (total: number) => void
  recordResult: (result: RunItemResult, done: number) => void
  finishRun: () => void
}

const clearedResults = () => ({ plan: null, results: [] as RunItemResult[], progress: null })
const clearedRows = () => ({ sourceRows: [] as TransportRow[], sourceTruncated: false, ...clearedResults() })
const clearedEntity = () => ({ entity: null, viewId: null, fetchXml: '', selectedFields: null, ...clearedRows() })

export const useTransporterStore = create<TransporterState>()((set) => ({
  step: 'connections',
  source: null,
  targetEnvironmentId: null,
  entity: null,
  viewId: null,
  fetchXml: '',
  maxRows: 2000,
  sourceRows: [],
  sourceTruncated: false,
  options: DEFAULT_PLAN_OPTIONS,
  selectedFields: null,
  plan: null,
  results: [],
  progress: null,
  running: false,
  setStep: (step) => set({ step }),
  setSource: (source) => set({ source, ...clearedEntity() }),
  setTarget: (targetEnvironmentId) => set({ targetEnvironmentId, selectedFields: null, ...clearedResults() }),
  setEntity: (entity) => set({ ...clearedEntity(), entity }),
  setView: (viewId, fetchXml) => set({ viewId, fetchXml, ...clearedRows() }),
  setFetchXml: (fetchXml) => set({ fetchXml, ...clearedRows() }),
  setMaxRows: (maxRows) => set({ maxRows }),
  setSourceRows: (sourceRows, sourceTruncated) => set({ sourceRows, sourceTruncated, ...clearedResults() }),
  setOptions: (options) => set({ options, plan: null, results: [], progress: null }),
  setSelectedFields: (selectedFields) => set({ selectedFields, plan: null, results: [], progress: null }),
  setPlan: (plan) => set({ plan, results: [], progress: null }),
  startRun: (total) => set({ running: true, results: [], progress: { done: 0, total } }),
  recordResult: (result, done) =>
    set((state) => ({ results: [...state.results, result], progress: { done, total: state.progress?.total ?? done } })),
  finishRun: () => set({ running: false }),
}))
