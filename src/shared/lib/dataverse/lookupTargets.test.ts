import { describe, expect, it } from 'vitest'

import { type ManyToOneRelationship, resolveLookupTargets } from './lookupTargets'

const relationships: ManyToOneRelationship[] = [
  {
    ReferencingAttribute: 'primarycontactid',
    ReferencedEntity: 'contact',
    ReferencingEntityNavigationPropertyName: 'primarycontactid',
  },
  {
    ReferencingAttribute: 'new_parentaccountid',
    ReferencedEntity: 'account',
    ReferencingEntityNavigationPropertyName: 'new_ParentAccountId',
  },
  {
    ReferencingAttribute: 'customerid',
    ReferencedEntity: 'account',
    ReferencingEntityNavigationPropertyName: 'customerid_account',
  },
  {
    ReferencingAttribute: 'customerid',
    ReferencedEntity: 'contact',
    ReferencingEntityNavigationPropertyName: 'customerid_contact',
  },
  { ReferencingAttribute: 'ownerid', ReferencedEntity: 'owner', ReferencingEntityNavigationPropertyName: 'ownerid' },
  {
    ReferencingAttribute: 'owninguser',
    ReferencedEntity: 'systemuser',
    ReferencingEntityNavigationPropertyName: 'owninguser',
  },
]

describe('resolveLookupTargets', () => {
  it('uses the relationship navigation property, including schema casing', () => {
    expect(resolveLookupTargets('primarycontactid', 'Lookup', ['contact'], relationships)).toEqual([
      { logicalName: 'contact', navigationProperty: 'primarycontactid' },
    ])
    expect(resolveLookupTargets('new_parentaccountid', 'Lookup', ['account'], relationships)).toEqual([
      { logicalName: 'account', navigationProperty: 'new_ParentAccountId' },
    ])
  })

  it('resolves polymorphic targets individually', () => {
    expect(resolveLookupTargets('customerid', 'Customer', ['account', 'contact'], relationships)).toEqual([
      { logicalName: 'account', navigationProperty: 'customerid_account' },
      { logicalName: 'contact', navigationProperty: 'customerid_contact' },
    ])
  })

  it('binds owner fields through the attribute itself', () => {
    expect(resolveLookupTargets('ownerid', 'Owner', ['systemuser', 'team'], relationships)).toEqual([
      { logicalName: 'systemuser', navigationProperty: 'ownerid' },
      { logicalName: 'team', navigationProperty: 'ownerid' },
    ])
  })

  it('falls back to the legacy naming when no relationship matches', () => {
    expect(resolveLookupTargets('unknownid', 'Lookup', ['account'], [])).toEqual([
      { logicalName: 'account', navigationProperty: 'unknownid' },
    ])
    expect(resolveLookupTargets('regardingobjectid', 'Lookup', ['account', 'contact'], [])).toEqual([
      { logicalName: 'account', navigationProperty: 'regardingobjectid_account' },
      { logicalName: 'contact', navigationProperty: 'regardingobjectid_contact' },
    ])
  })
})
