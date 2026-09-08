import { describe, expect, it } from 'vitest'

import { forgetValue, HISTORY_LIMIT, rememberValue } from './preferences'

describe('rememberValue', () => {
  it('puts the newest value first and drops duplicates', () => {
    expect(rememberValue(['Contoso.Models', 'Fabrikam'], 'Fabrikam')).toEqual(['Fabrikam', 'Contoso.Models'])
    expect(rememberValue([], ' Contoso.Models ')).toEqual(['Contoso.Models'])
  })

  it('ignores blank values', () => {
    expect(rememberValue(['Contoso.Models'], '   ')).toEqual(['Contoso.Models'])
  })

  it('caps the history', () => {
    const history = Array.from({ length: HISTORY_LIMIT }, (_, index) => `Namespace${index}`)
    const next = rememberValue(history, 'Newest')
    expect(next).toHaveLength(HISTORY_LIMIT)
    expect(next[0]).toBe('Newest')
    expect(next).not.toContain(`Namespace${HISTORY_LIMIT - 1}`)
  })
})

describe('forgetValue', () => {
  it('removes the value and leaves the rest in order', () => {
    expect(forgetValue(['Fabrikam', 'Contoso.Models', 'eyfrcc,chfs'], ' eyfrcc,chfs ')).toEqual([
      'Fabrikam',
      'Contoso.Models',
    ])
    expect(forgetValue(['Fabrikam'], 'Unknown')).toEqual(['Fabrikam'])
  })
})
