import { columnKind, isSystemColumn } from '@/modules/codegen/lib'
import { type CodegenColumn, type CodegenTable } from '@/shared/types'

export type PayloadMode = 'create' | 'update'

const LOOKUP_ANNOTATION = '@Microsoft.Dynamics.CRM.lookuplogicalname'

const isIncluded = (column: CodegenColumn, mode: PayloadMode): boolean => {
  if (column.isPrimaryId || isSystemColumn(column)) {
    return false
  }
  const kind = columnKind(column)
  if (kind === 'image' || kind === 'file') {
    return false
  }
  return mode === 'create' ? column.isValidForCreate : column.isValidForUpdate
}

const lookupBinding = (column: CodegenColumn, values: Record<string, unknown>): [string, string] | null => {
  const id = values[`_${column.logicalName}_value`]
  if (typeof id !== 'string' || !id) {
    return null
  }
  const targetName = values[`_${column.logicalName}_value${LOOKUP_ANNOTATION}`]
  const target = column.targets.find((candidate) => candidate.logicalName === targetName) ?? column.targets[0]
  if (!target?.entitySetName) {
    return null
  }
  return [`${target.navigationProperty}@odata.bind`, `/${target.entitySetName}(${id})`]
}

export const buildRecordPayload = (
  values: Record<string, unknown>,
  table: CodegenTable,
  mode: PayloadMode,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {}
  for (const column of table.columns) {
    if (!isIncluded(column, mode)) {
      continue
    }
    if (columnKind(column) === 'lookup') {
      const binding = lookupBinding(column, values)
      if (binding) {
        payload[binding[0]] = binding[1]
      }
      continue
    }
    const value = values[column.logicalName]
    if (value !== null && value !== undefined && value !== '') {
      payload[column.logicalName] = value
    }
  }
  return payload
}

export const formatPayload = (payload: Record<string, unknown>): string => JSON.stringify(payload, null, 2)
