import { isGuid, normalizeGuid } from '@/shared/lib'
import { type TransportRow } from '@/shared/types'

export interface PlanOptions {
  create: boolean
  update: boolean
  deleteMissing: boolean
}

export type PlannedAction = 'create' | 'update' | 'skip'

export interface PlannedRow {
  id: string | null
  row: TransportRow
  action: PlannedAction
  reason: string | null
}

export interface PlanCounts {
  create: number
  update: number
  skip: number
  delete: number
}

export interface TransportPlan {
  rows: PlannedRow[]
  deletes: string[]
  counts: PlanCounts
}

export const DEFAULT_PLAN_OPTIONS: PlanOptions = { create: true, update: true, deleteMissing: false }

export const rowId = (row: TransportRow, primaryIdAttribute: string): string | null => {
  const value = row[primaryIdAttribute]
  return typeof value === 'string' && isGuid(value) ? normalizeGuid(value) : null
}

const planRow = (row: TransportRow, id: string | null, existsInTarget: boolean, options: PlanOptions): PlannedRow => {
  if (!id) {
    return { id, row, action: 'skip', reason: 'The row has no primary id' }
  }
  if (existsInTarget) {
    return options.update
      ? { id, row, action: 'update', reason: null }
      : { id, row, action: 'skip', reason: 'Exists in the target and updates are off' }
  }
  return options.create
    ? { id, row, action: 'create', reason: null }
    : { id, row, action: 'skip', reason: 'Missing in the target and creates are off' }
}

export const buildPlan = (
  sourceRows: TransportRow[],
  primaryIdAttribute: string,
  existingTargetIds: Set<string>,
  targetIdsInScope: Set<string> | null,
  options: PlanOptions,
): TransportPlan => {
  const sourceIds = new Set<string>()
  const rows = sourceRows.map((row) => {
    const id = rowId(row, primaryIdAttribute)
    if (id) {
      sourceIds.add(id)
    }
    return planRow(row, id, id !== null && existingTargetIds.has(id), options)
  })
  const deletes =
    options.deleteMissing && targetIdsInScope ? [...targetIdsInScope].filter((id) => !sourceIds.has(id)) : []
  const counts: PlanCounts = { create: 0, update: 0, skip: 0, delete: deletes.length }
  for (const planned of rows) {
    counts[planned.action] += 1
  }
  return { rows, deletes, counts }
}
