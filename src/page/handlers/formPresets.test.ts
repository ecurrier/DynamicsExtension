import { describe, expect, it } from 'vitest'

import { toPresetValue } from './formPresets'

describe('toPresetValue', () => {
  it('serialises dates as ISO strings so they survive the page bridge', () => {
    expect(toPresetValue(new Date('2026-09-07T10:30:00.000Z'))).toBe('2026-09-07T10:30:00.000Z')
  })

  it('leaves every other value untouched', () => {
    const lookup = [{ id: '{1}', entityType: 'account', name: 'Contoso' }]
    expect(toPresetValue(lookup)).toBe(lookup)
    expect(toPresetValue(100000001)).toBe(100000001)
    expect(toPresetValue('text')).toBe('text')
    expect(toPresetValue(true)).toBe(true)
    expect(toPresetValue(null)).toBeNull()
  })
})
