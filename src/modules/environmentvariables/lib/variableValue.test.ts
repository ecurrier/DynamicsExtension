import { describe, expect, it } from 'vitest'

import { type EnvironmentVariable } from '@/shared/types'

import {
  effectiveValue,
  isEditableType,
  normalizeVariableValue,
  validateVariableValue,
  variableMatches,
} from './variableValue'

const variable = (overrides: Partial<EnvironmentVariable> = {}): EnvironmentVariable => ({
  id: 'v1',
  schemaName: 'contoso_ApiUrl',
  displayName: 'API URL',
  description: 'Base address',
  type: 100000000,
  defaultValue: 'https://default',
  currentValue: null,
  valueId: null,
  isManaged: false,
  hint: null,
  valueSchema: null,
  ...overrides,
})

describe('variable values', () => {
  it('validates by type', () => {
    expect(validateVariableValue(100000000, '  ')).toMatch(/Enter a value/)
    expect(validateVariableValue(100000000, 'text')).toBeNull()
    expect(validateVariableValue(100000001, '12.5')).toBeNull()
    expect(validateVariableValue(100000001, 'twelve')).toBe('Enter a numeric value')
    expect(validateVariableValue(100000002, 'Yes')).toBeNull()
    expect(validateVariableValue(100000002, 'maybe')).toBe('Enter yes or no')
    expect(validateVariableValue(100000003, '{"a":1}')).toBeNull()
    expect(validateVariableValue(100000003, '{a}')).toMatch(/Enter valid JSON/)
  })

  it('normalizes booleans to yes and no and trims everything else', () => {
    expect(normalizeVariableValue(100000002, ' TRUE ')).toBe('yes')
    expect(normalizeVariableValue(100000002, 'no')).toBe('no')
    expect(normalizeVariableValue(100000001, ' 3 ')).toBe('3')
    expect(normalizeVariableValue(100000003, ' {"a":1} ')).toBe('{"a":1}')
  })

  it('treats secrets as read only', () => {
    expect(isEditableType(100000005)).toBe(false)
    expect(isEditableType(100000004)).toBe(true)
  })

  it('resolves the effective value from current, then default', () => {
    expect(effectiveValue(variable({ currentValue: 'https://current' }))).toEqual({
      value: 'https://current',
      source: 'current',
    })
    expect(effectiveValue(variable())).toEqual({ value: 'https://default', source: 'default' })
    expect(effectiveValue(variable({ defaultValue: null }))).toEqual({ value: null, source: 'none' })
  })

  it('filters by text and type', () => {
    expect(variableMatches(variable(), 'api', null)).toBe(true)
    expect(variableMatches(variable(), 'contoso_', null)).toBe(true)
    expect(variableMatches(variable(), 'base address', null)).toBe(true)
    expect(variableMatches(variable(), 'missing', null)).toBe(false)
    expect(variableMatches(variable(), '', 100000001)).toBe(false)
    expect(variableMatches(variable(), '', 100000000)).toBe(true)
  })
})
