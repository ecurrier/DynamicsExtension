import { describe, expect, it } from 'vitest'

import { referencesAttribute } from './columnUsage'

describe('referencesAttribute', () => {
  it('matches the column name as a whole token', () => {
    expect(referencesAttribute('{"value":"@triggerOutputs()?[\'body/statuscode\']"}', 'statuscode')).toBe(true)
    expect(referencesAttribute('"new_amount"', 'new_amount')).toBe(true)
  })

  it('does not match a column name embedded in a longer name', () => {
    expect(referencesAttribute('{"field":"statuscodereason"}', 'statuscode')).toBe(false)
    expect(referencesAttribute('{"field":"new_statuscode"}', 'statuscode')).toBe(false)
  })

  it('is case insensitive and safe on empty definitions', () => {
    expect(referencesAttribute('body/StatusCode', 'statuscode')).toBe(true)
    expect(referencesAttribute(null, 'statuscode')).toBe(false)
    expect(referencesAttribute('', 'statuscode')).toBe(false)
  })
})
