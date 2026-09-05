import { describe, expect, it } from 'vitest'

import { type EntityInfo } from '@/shared/types'

import { buildRecordSearchQuery, mapRecordSearchRows } from './recordSearch'

const contact: EntityInfo = {
  logicalName: 'contact',
  displayName: 'Contact',
  entitySetName: 'contacts',
  primaryIdAttribute: 'contactid',
  primaryNameAttribute: 'fullname',
}

describe('buildRecordSearchQuery', () => {
  it('lists recent records for an empty term', () => {
    expect(buildRecordSearchQuery(contact, '  ', 25)).toBe(
      '?$select=contactid,fullname,modifiedon&$orderby=modifiedon desc&$top=25',
    )
    expect(buildRecordSearchQuery(contact, '', 25, false)).toBe(
      '?$select=contactid,fullname&$orderby=fullname asc&$top=25',
    )
  })

  it('filters by the primary name with escaping', () => {
    expect(buildRecordSearchQuery(contact, "O'Neil", 10)).toBe(
      "?$select=contactid,fullname,modifiedon&$filter=contains(fullname,'O''Neil')&$orderby=fullname asc&$top=10",
    )
  })

  it('looks up a pasted guid directly', () => {
    expect(buildRecordSearchQuery(contact, '{ABCDEF01-2345-6789-ABCD-EF0123456789}', 10)).toBe(
      '?$select=contactid,fullname,modifiedon&$filter=contactid eq abcdef01-2345-6789-abcd-ef0123456789',
    )
  })

  it('returns null when a text search is impossible', () => {
    expect(buildRecordSearchQuery({ ...contact, primaryNameAttribute: null }, 'x', 10)).toBeNull()
    expect(buildRecordSearchQuery({ ...contact, primaryNameAttribute: null }, '', 10, false)).toBe(
      '?$select=contactid&$orderby=contactid asc&$top=10',
    )
  })
})

describe('mapRecordSearchRows', () => {
  it('normalises ids and tolerates missing columns', () => {
    expect(
      mapRecordSearchRows(contact, [
        { contactid: '{ABC}', fullname: 'Jane', modifiedon: '2024-01-01T00:00:00Z' },
        { contactid: 'def', fullname: null },
        { fullname: 'orphan' },
      ]),
    ).toEqual([
      { id: 'abc', name: 'Jane', modifiedOn: '2024-01-01T00:00:00Z' },
      { id: 'def', name: '', modifiedOn: null },
    ])
  })
})
