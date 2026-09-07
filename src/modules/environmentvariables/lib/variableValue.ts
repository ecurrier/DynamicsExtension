import { type EnvironmentVariable, type EnvironmentVariableType } from '@/shared/types'

const NUMBER_TYPE: EnvironmentVariableType = 100000001
const BOOLEAN_TYPE: EnvironmentVariableType = 100000002
const JSON_TYPE: EnvironmentVariableType = 100000003
const SECRET_TYPE: EnvironmentVariableType = 100000005

const TRUE_VALUES = ['yes', 'true']
const FALSE_VALUES = ['no', 'false']

export interface EffectiveValue {
  value: string | null
  source: 'current' | 'default' | 'none'
}

export const isEditableType = (type: EnvironmentVariableType): boolean => type !== SECRET_TYPE

export const isTrueValue = (value: string): boolean => TRUE_VALUES.includes(value.trim().toLowerCase())

export const validateVariableValue = (type: EnvironmentVariableType, value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'Enter a value, or remove the current value to fall back to the default'
  }
  if (type === NUMBER_TYPE) {
    return Number.isFinite(Number(trimmed)) ? null : 'Enter a numeric value'
  }
  if (type === BOOLEAN_TYPE) {
    const lower = trimmed.toLowerCase()
    return TRUE_VALUES.includes(lower) || FALSE_VALUES.includes(lower) ? null : 'Enter yes or no'
  }
  if (type === JSON_TYPE) {
    try {
      JSON.parse(trimmed)
      return null
    } catch (error) {
      return `Enter valid JSON (${error instanceof Error ? error.message : 'invalid'})`
    }
  }
  return null
}

export const normalizeVariableValue = (type: EnvironmentVariableType, value: string): string => {
  const trimmed = value.trim()
  if (type === BOOLEAN_TYPE) {
    return isTrueValue(trimmed) ? 'yes' : 'no'
  }
  return trimmed
}

export const effectiveValue = (variable: EnvironmentVariable): EffectiveValue => {
  if (variable.currentValue !== null) {
    return { value: variable.currentValue, source: 'current' }
  }
  if (variable.defaultValue !== null) {
    return { value: variable.defaultValue, source: 'default' }
  }
  return { value: null, source: 'none' }
}

export const variableMatches = (
  variable: EnvironmentVariable,
  filter: string,
  typeFilter: EnvironmentVariableType | null,
): boolean => {
  if (typeFilter !== null && variable.type !== typeFilter) {
    return false
  }
  const term = filter.trim().toLowerCase()
  if (!term) {
    return true
  }
  return [variable.displayName, variable.schemaName, variable.description].some((value) =>
    value?.toLowerCase().includes(term),
  )
}
