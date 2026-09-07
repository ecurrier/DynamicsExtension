import { describe, expect, it } from 'vitest'

import { type RecordAccessReport } from '@/shared/types'

import { accessReasons, accessSummary, describeRights } from './access'

const report = (overrides: Partial<RecordAccessReport> = {}): RecordAccessReport => ({
  entityLogicalName: 'account',
  recordId: 'r1',
  systemUserId: 'u1',
  userName: 'Ada Lovelace',
  userBusinessUnitName: 'Sales',
  rights: ['ReadAccess', 'WriteAccess'],
  ownerId: 'u2',
  ownerName: 'Grace Hopper',
  ownerType: 'systemuser',
  ownerIsCurrentUser: false,
  recordBusinessUnitName: 'Service',
  roles: [],
  teams: [],
  privileges: [],
  shares: [],
  sharesUnavailable: null,
  privilegesUnavailable: null,
  ...overrides,
})

describe('describeRights', () => {
  it('reads as plain words', () => {
    expect(describeRights(['ReadAccess', 'WriteAccess'])).toBe('Read, Write')
    expect(describeRights([])).toBe('No access')
  })
})

describe('accessSummary', () => {
  it('leads with the answer', () => {
    expect(accessSummary(report())).toBe('Ada Lovelace can read, write this record.')
    expect(accessSummary(report({ rights: [] }))).toBe('Ada Lovelace has no access to this record at all.')
  })

  it('calls out the odd case of rights without read', () => {
    expect(accessSummary(report({ rights: ['AppendToAccess'] }))).toContain('cannot read this record')
  })
})

describe('accessReasons', () => {
  it('explains ownership and business unit', () => {
    const reasons = accessReasons(report())
    expect(reasons[0]).toContain('owned by Grace Hopper')
    expect(reasons[1]).toContain('Service business unit')
    expect(reasons[1]).toContain('Sales')
  })

  it('notes when the user owns the record', () => {
    expect(accessReasons(report({ ownerIsCurrentUser: true }))[0]).toBe('They own this record.')
  })

  it('surfaces a direct share', () => {
    const reasons = accessReasons(
      report({
        shares: [{ principalId: 'u1', principalName: 'Ada', principalType: 'systemuser', rights: ['ReadAccess'] }],
      }),
    )
    expect(reasons.some((reason) => reason.includes('shared directly'))).toBe(true)
  })

  it('points at the likely cause when no role grants anything', () => {
    const reasons = accessReasons(report({ rights: [], privileges: [] }))
    expect(reasons.some((reason) => reason.includes('None of their security roles'))).toBe(true)
  })
})
