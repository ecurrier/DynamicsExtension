import { describe, expect, it } from 'vitest'

import { parseAccessRights } from './recordAccess'

describe('parseAccessRights', () => {
  it('splits the comma separated mask', () => {
    expect(parseAccessRights('ReadAccess, WriteAccess, AppendToAccess')).toEqual([
      'ReadAccess',
      'WriteAccess',
      'AppendToAccess',
    ])
  })

  it('treats None and empty as no access', () => {
    expect(parseAccessRights('None')).toEqual([])
    expect(parseAccessRights('')).toEqual([])
    expect(parseAccessRights(null)).toEqual([])
  })

  it('drops duplicates', () => {
    expect(parseAccessRights('ReadAccess, ReadAccess')).toEqual(['ReadAccess'])
  })
})
