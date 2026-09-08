import { describe, expect, it } from 'vitest'

import { SAMPLE_TABLE } from './sample'
import { buildTableView, isSystemColumn, orderColumns } from './tableView'

const view = (settings: Record<string, string> = { prefix: 'new' }, includeSystemColumns = false) =>
  buildTableView(SAMPLE_TABLE, { language: 'csharp', includeSystemColumns, settings })

const columnNamed = (logicalName: string, settings?: Record<string, string>) => {
  const column = view(settings).columns.find((candidate) => candidate.logicalName === logicalName)
  if (!column) {
    throw new Error(`${logicalName} is not in the view`)
  }
  return column
}

describe('isSystemColumn', () => {
  it('flags helper, bookkeeping, unreadable, and unsupported columns', () => {
    const flagged = SAMPLE_TABLE.columns.filter(isSystemColumn).map((column) => column.logicalName)
    expect(flagged).toEqual(['parentaccountidname', 'versionnumber'])
  })
})

describe('orderColumns', () => {
  it('puts the primary id first, the primary name second, then sorts by logical name', () => {
    const names = orderColumns(SAMPLE_TABLE.columns).map((column) => column.logicalName)
    expect(names.slice(0, 3)).toEqual(['accountid', 'name', 'createdon'])
    expect(names.at(-1)).toBe('versionnumber')
  })
})

describe('buildTableView', () => {
  it('describes the table with identifiers derived from the schema name', () => {
    expect(view().table).toEqual({
      logicalName: 'account',
      schemaName: 'Account',
      displayName: 'Account',
      displayCollectionName: 'Accounts',
      entitySetName: 'accounts',
      primaryIdAttribute: 'accountid',
      primaryNameAttribute: 'name',
      identifier: 'Account',
      identifierCamel: 'account',
      isCustom: false,
    })
  })

  it('excludes system columns by default and includes them on request', () => {
    const names = view().columns.map((column) => column.logicalName)
    expect(names).not.toContain('versionnumber')
    expect(names).not.toContain('parentaccountidname')
    const all = view({ prefix: 'new' }, true).columns.map((column) => column.logicalName)
    expect(all).toContain('versionnumber')
    expect(all).toContain('parentaccountidname')
  })

  it('marks the first and last column', () => {
    const columns = view().columns
    expect(columns[0]?.logicalName).toBe('accountid')
    expect(columns[0]?.isFirst).toBe(true)
    expect(columns.at(-1)?.logicalName).toBe('parentaccountid')
    expect(columns.at(-1)?.isLast).toBe(true)
    expect(columns.filter((column) => column.isFirst || column.isLast)).toHaveLength(2)
  })

  it('strips the prefix setting from identifiers', () => {
    expect(columnNamed('new_creditlimit').identifier).toBe('CreditLimit')
    expect(columnNamed('new_creditlimit').identifierCamel).toBe('creditLimit')
    expect(columnNamed('new_creditlimit', {}).identifier).toBe('NewCreditLimit')
    expect(columnNamed('accountid').identifier).toBe('AccountId')
  })

  it('applies the fixed type map from the column metadata', () => {
    expect(columnNamed('new_renewaldate').csType).toBe('DateOnly?')
    expect(columnNamed('createdon').csType).toBe('DateTime?')
    expect(columnNamed('new_tags').csType).toBe('OptionSetValueCollection')
    expect(columnNamed('ownerid').csType).toBe('EntityReference')
    expect(columnNamed('new_creditlimit').csType).toBe('Money')
    expect(columnNamed('donotemail').csType).toBe('bool?')
    expect(columnNamed('entityimage').csType).toBe('byte[]')
    expect(columnNamed('new_contract').csType).toBe('Guid?')
    expect(columnNamed('new_tags').tsType).toBe('number[]')
    expect(columnNamed('new_tags').type).toBe('OptionSetValueCollection')
    const typescript = buildTableView(SAMPLE_TABLE, {
      language: 'typescript',
      includeSystemColumns: false,
      settings: {},
    })
    expect(typescript.columns.find((column) => column.logicalName === 'new_tags')?.type).toBe('number[]')
  })

  it('exposes requirement, kind flags, and sizes', () => {
    expect(columnNamed('name').isRequired).toBe(true)
    expect(columnNamed('ownerid').isRequired).toBe(true)
    expect(columnNamed('new_status').isRequired).toBe(false)
    expect(columnNamed('name').maxLength).toBe(160)
    expect(columnNamed('new_customerscore').precision).toBe(2)
    expect(columnNamed('ownerid').isLookup).toBe(true)
    expect(columnNamed('new_status').isChoice).toBe(true)
    expect(columnNamed('new_tags').isMultiChoice).toBe(true)
    expect(columnNamed('new_renewaldate').isDateOnly).toBe(true)
    expect(columnNamed('createdon').isValidForCreate).toBe(false)
  })

  it('names lookup targets and their entity sets', () => {
    expect(columnNamed('ownerid').targets).toEqual([
      {
        logicalName: 'systemuser',
        navigationProperty: 'ownerid',
        entitySetName: 'systemusers',
        identifier: 'Systemuser',
      },
      { logicalName: 'team', navigationProperty: 'ownerid', entitySetName: 'teams', identifier: 'Team' },
    ])
  })

  it('names the choice the way the choice view will', () => {
    expect(columnNamed('new_status').choiceName).toBe('new_account_new_status')
    expect(columnNamed('new_status').choiceIdentifier).toBe('OnboardingStatus')
    expect(columnNamed('industrycode').choiceIdentifier).toBe('Industry')
    expect(columnNamed('donotemail').choiceIdentifier).toBe('DonotallowEmails')
    expect(columnNamed('name').choiceIdentifier).toBeNull()
  })

  it('passes the settings through', () => {
    expect(view({ prefix: 'new', namespace: 'Contoso.Models' }).settings).toEqual({
      prefix: 'new',
      namespace: 'Contoso.Models',
    })
  })
})
