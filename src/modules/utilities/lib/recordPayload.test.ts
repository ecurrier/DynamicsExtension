import { describe, expect, it } from 'vitest'

import { SAMPLE_TABLE } from '@/modules/codegen/lib'

import { buildRecordPayload, formatPayload } from './recordPayload'

const values: Record<string, unknown> = {
  accountid: 'id-1',
  name: 'Contoso',
  new_creditlimit: 5000,
  'new_creditlimit@OData.Community.Display.V1.FormattedValue': '$5,000.00',
  new_customerscore: null,
  new_status: 100000001,
  'new_status@OData.Community.Display.V1.FormattedValue': 'In Progress',
  industrycode: null,
  new_tags: '1,2',
  new_renewaldate: '2026-01-31',
  createdon: '2026-01-01T00:00:00Z',
  _parentaccountid_value: 'id-2',
  '_parentaccountid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'account',
  '_parentaccountid_value@OData.Community.Display.V1.FormattedValue': 'Parent Ltd',
  _ownerid_value: 'team-1',
  '_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'team',
  donotemail: true,
  numberofemployees: 12,
  parentaccountidname: 'Parent Ltd',
  versionnumber: 99,
  entityimage: 'base64',
}

describe('buildRecordPayload', () => {
  it('builds a create body with lookups bound to their entity set', () => {
    expect(buildRecordPayload(values, SAMPLE_TABLE, 'create')).toEqual({
      donotemail: true,
      name: 'Contoso',
      new_creditlimit: 5000,
      new_renewaldate: '2026-01-31',
      new_status: 100000001,
      new_tags: '1,2',
      numberofemployees: 12,
      'ownerid@odata.bind': '/teams(team-1)',
      'parentaccountid@odata.bind': '/accounts(id-2)',
    })
  })

  it('drops the primary id, read-only, helper, bookkeeping, image, empty, and annotation values', () => {
    const payload = buildRecordPayload(values, SAMPLE_TABLE, 'create')
    for (const key of [
      'accountid',
      'createdon',
      'parentaccountidname',
      'versionnumber',
      'entityimage',
      'industrycode',
    ]) {
      expect(payload).not.toHaveProperty(key)
    }
    expect(Object.keys(payload).some((key) => key.includes('@OData.Community'))).toBe(false)
  })

  it('keeps only columns valid for update in an update body', () => {
    const payload = buildRecordPayload(values, SAMPLE_TABLE, 'update')
    expect(payload).not.toHaveProperty('accountid')
    expect(payload).not.toHaveProperty('createdon')
    expect(payload.name).toBe('Contoso')
    expect(payload['parentaccountid@odata.bind']).toBe('/accounts(id-2)')
  })

  it('falls back to the first target when the lookup carries no logical name annotation', () => {
    const payload = buildRecordPayload({ _ownerid_value: 'user-1' }, SAMPLE_TABLE, 'create')
    expect(payload['ownerid@odata.bind']).toBe('/systemusers(user-1)')
  })

  it('formats the body as indented JSON', () => {
    expect(formatPayload({ name: 'Contoso' })).toBe('{\n  "name": "Contoso"\n}')
  })
})
