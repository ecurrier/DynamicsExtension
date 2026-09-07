import { describe, expect, it } from 'vitest'

import { hasChanges, roleDiff } from './roleDiff'

describe('roleDiff', () => {
  it('computes additions and removals', () => {
    const diff = roleDiff(['a', 'b'], ['b', 'c'])
    expect(diff).toEqual({ associate: ['c'], disassociate: ['a'] })
    expect(hasChanges(diff)).toBe(true)
  })

  it('reports no changes for identical sets', () => {
    expect(hasChanges(roleDiff(['a'], ['a']))).toBe(false)
  })
})
