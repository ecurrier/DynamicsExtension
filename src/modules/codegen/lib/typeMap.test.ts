import { describe, expect, it } from 'vitest'

import { columnKind, csharpType, typeFor, typescriptType } from './typeMap'

const kindOf = (attributeType: string, typeName = `${attributeType}Type`, dateTimeBehavior = null) =>
  columnKind({ attributeType, typeName, dateTimeBehavior })

describe('columnKind', () => {
  it('maps the simple attribute types', () => {
    expect(kindOf('String')).toBe('string')
    expect(kindOf('Memo')).toBe('memo')
    expect(kindOf('Integer')).toBe('integer')
    expect(kindOf('BigInt')).toBe('bigint')
    expect(kindOf('Decimal')).toBe('decimal')
    expect(kindOf('Double')).toBe('double')
    expect(kindOf('Money')).toBe('money')
    expect(kindOf('Boolean')).toBe('boolean')
    expect(kindOf('Uniqueidentifier')).toBe('guid')
  })

  it('treats every reference type as a lookup and every option set as a choice', () => {
    expect(kindOf('Lookup')).toBe('lookup')
    expect(kindOf('Customer')).toBe('lookup')
    expect(kindOf('Owner')).toBe('lookup')
    expect(kindOf('Picklist')).toBe('choice')
    expect(kindOf('State')).toBe('choice')
    expect(kindOf('Status')).toBe('choice')
  })

  it('follows the date-time behaviour, not the display format', () => {
    expect(columnKind({ attributeType: 'DateTime', typeName: 'DateTimeType', dateTimeBehavior: 'DateOnly' })).toBe(
      'dateOnly',
    )
    expect(columnKind({ attributeType: 'DateTime', typeName: 'DateTimeType', dateTimeBehavior: 'UserLocal' })).toBe(
      'dateTime',
    )
    expect(columnKind({ attributeType: 'DateTime', typeName: 'DateTimeType', dateTimeBehavior: null })).toBe('dateTime')
  })

  it('resolves virtual columns by their type name', () => {
    expect(kindOf('Virtual', 'MultiSelectPicklistType')).toBe('multiChoice')
    expect(kindOf('Virtual', 'ImageType')).toBe('image')
    expect(kindOf('Virtual', 'FileType')).toBe('file')
    expect(kindOf('Virtual', 'PartyListType')).toBe('other')
    expect(kindOf('ManagedProperty')).toBe('other')
  })
})

describe('type maps', () => {
  it('emits nullable value types and SDK reference types for C#', () => {
    expect(csharpType('integer')).toBe('int?')
    expect(csharpType('money')).toBe('Money')
    expect(csharpType('lookup')).toBe('EntityReference')
    expect(csharpType('choice')).toBe('OptionSetValue')
    expect(csharpType('multiChoice')).toBe('OptionSetValueCollection')
    expect(csharpType('dateOnly')).toBe('DateOnly?')
    expect(csharpType('dateTime')).toBe('DateTime?')
    expect(csharpType('image')).toBe('byte[]')
    expect(csharpType('other')).toBe('object')
  })

  it('emits primitive types for TypeScript', () => {
    expect(typescriptType('money')).toBe('number')
    expect(typescriptType('lookup')).toBe('string')
    expect(typescriptType('multiChoice')).toBe('number[]')
    expect(typescriptType('boolean')).toBe('boolean')
    expect(typescriptType('other')).toBe('unknown')
  })

  it('shares the TypeScript map with JavaScript', () => {
    expect(typeFor('decimal', 'csharp')).toBe('decimal?')
    expect(typeFor('decimal', 'typescript')).toBe('number')
    expect(typeFor('decimal', 'javascript')).toBe('number')
  })
})
