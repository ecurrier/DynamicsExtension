import { describe, expect, it } from 'vitest'

import { createFakeHttp } from '@/test/fakeHttp'

import { auditOperations, diffAuditValues, readAuditValues } from './audit'

const RECORD = '11111111-1111-4111-8111-111111111111'
const AUDIT = '22222222-2222-4222-8222-222222222222'

describe('readAuditValues', () => {
  it('prefers the formatted value over the raw one', () => {
    const values = readAuditValues({
      _ownerid_value: '4026be43-6b69-e111-8f65-78e7d1620f5e',
      '_ownerid_value@OData.Community.Display.V1.FormattedValue': 'Ada Lovelace',
      revenue: 1000,
    })
    expect(values.get('_ownerid_value')).toBe('Ada Lovelace')
    expect(values.get('revenue')).toBe('1000')
  })

  it('ignores annotation keys and the odata type marker', () => {
    const values = readAuditValues({ '@odata.type': '#Microsoft.Dynamics.CRM.account', name: 'Contoso' })
    expect([...values.keys()]).toEqual(['name'])
  })
})

describe('diffAuditValues', () => {
  it('reports changed, added, and removed columns', () => {
    expect(diffAuditValues({ name: 'Old', dropped: 'gone' }, { name: 'New', added: 'fresh' })).toEqual([
      { attribute: 'added', oldValue: null, newValue: 'fresh' },
      { attribute: 'dropped', oldValue: 'gone', newValue: null },
      { attribute: 'name', oldValue: 'Old', newValue: 'New' },
    ])
  })

  it('handles a create, where there is no old value', () => {
    expect(diffAuditValues(null, { name: 'Contoso' })).toEqual([
      { attribute: 'name', oldValue: null, newValue: 'Contoso' },
    ])
  })
})

describe('auditOperations.getRecordHistory', () => {
  const entityResponse = {
    LogicalName: 'account',
    SchemaName: 'Account',
    EntitySetName: 'accounts',
    PrimaryIdAttribute: 'accountid',
  }

  it('reads who and when from the audit table, not from the change history message', async () => {
    const { http, calls } = createFakeHttp({
      "EntityDefinitions(LogicalName='account')?$select=LogicalName,SchemaName": entityResponse,
      'organizations?$select=isauditenabled': { value: [{ isauditenabled: true }] },
      "EntityDefinitions(LogicalName='account')?$select=IsAuditEnabled": { IsAuditEnabled: { Value: true } },
      'Attributes?$select=LogicalName,AttributeType': {
        value: [
          { LogicalName: 'name', AttributeType: 'String', IsAuditEnabled: { Value: true } },
          { LogicalName: 'primarycontactid', AttributeType: 'Lookup', IsAuditEnabled: { Value: false } },
        ],
      },
      'audits?$select=auditid': {
        value: [
          {
            auditid: AUDIT,
            createdon: '2026-01-02T03:04:05Z',
            _userid_value: '33333333-3333-4333-8333-333333333333',
            '_userid_value@OData.Community.Display.V1.FormattedValue': 'Ada Lovelace',
            'action@OData.Community.Display.V1.FormattedValue': 'Update',
            'operation@OData.Community.Display.V1.FormattedValue': 'Update',
          },
        ],
      },
    })

    const history = await auditOperations(http).getRecordHistory({
      entityLogicalName: 'account',
      recordId: RECORD,
    })

    expect(history.entries).toEqual([
      {
        id: AUDIT,
        createdOn: '2026-01-02T03:04:05Z',
        userId: '33333333-3333-4333-8333-333333333333',
        userName: 'Ada Lovelace',
        actionLabel: 'Update',
        operationLabel: 'Update',
      },
    ])
    expect(history.configuration).toMatchObject({
      organizationEnabled: true,
      tableEnabled: true,
      auditedColumns: 1,
      totalColumns: 2,
      unauditedLookups: ['primarycontactid'],
    })
    const auditCall = calls.find((call) => call.path.startsWith('audits?'))
    expect(auditCall?.headers).toEqual({ Prefer: 'odata.include-annotations="*"' })
  })

  it('surfaces a failure to read audit rows instead of pretending there is no history', async () => {
    const { http } = createFakeHttp({
      "EntityDefinitions(LogicalName='contact')?$select=LogicalName,SchemaName": {
        ...entityResponse,
        LogicalName: 'contact',
        EntitySetName: 'contacts',
      },
      'audits?$select=auditid': () => {
        throw new Error('Principal user is missing prvReadAuditSummary')
      },
    })

    const history = await auditOperations(http).getRecordHistory({
      entityLogicalName: 'contact',
      recordId: RECORD,
    })
    expect(history.entries).toEqual([])
    expect(history.unavailable).toContain('prvReadAuditSummary')
  })
})

describe('auditOperations.getAuditDetail', () => {
  it('diffs an attribute audit detail', async () => {
    const { http } = createFakeHttp({
      RetrieveAuditDetails: {
        AuditDetail: {
          '@odata.type': '#Microsoft.Dynamics.CRM.AttributeAuditDetail',
          OldValue: { name: 'Old name' },
          NewValue: { name: 'New name' },
        },
      },
    })
    const detail = await auditOperations(http).getAuditDetail({ auditId: AUDIT })
    expect(detail.detailType).toBe('Column changes')
    expect(detail.changes).toEqual([{ attribute: 'name', oldValue: 'Old name', newValue: 'New name' }])
  })

  it('explains a sharing event, which carries no column diff', async () => {
    const { http } = createFakeHttp({
      RetrieveAuditDetails: {
        AuditDetail: { '@odata.type': '#Microsoft.Dynamics.CRM.ShareAuditDetail' },
      },
    })
    const detail = await auditOperations(http).getAuditDetail({ auditId: AUDIT })
    expect(detail.detailType).toBe('Sharing change')
    expect(detail.changes).toEqual([])
    expect(detail.note).toContain('shared')
  })
})
