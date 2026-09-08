import { type CodegenColumn, type TemplateLanguage } from '@/shared/types'

export type ColumnKind =
  | 'string'
  | 'memo'
  | 'integer'
  | 'bigint'
  | 'decimal'
  | 'double'
  | 'money'
  | 'boolean'
  | 'dateOnly'
  | 'dateTime'
  | 'lookup'
  | 'choice'
  | 'multiChoice'
  | 'guid'
  | 'image'
  | 'file'
  | 'other'

const VIRTUAL_KINDS: Record<string, ColumnKind> = {
  MultiSelectPicklistType: 'multiChoice',
  ImageType: 'image',
  FileType: 'file',
}

const ATTRIBUTE_KINDS: Record<string, ColumnKind> = {
  String: 'string',
  Memo: 'memo',
  Integer: 'integer',
  BigInt: 'bigint',
  Decimal: 'decimal',
  Double: 'double',
  Money: 'money',
  Boolean: 'boolean',
  Lookup: 'lookup',
  Customer: 'lookup',
  Owner: 'lookup',
  Picklist: 'choice',
  State: 'choice',
  Status: 'choice',
  Uniqueidentifier: 'guid',
}

const CSHARP_TYPES: Record<ColumnKind, string> = {
  string: 'string',
  memo: 'string',
  integer: 'int?',
  bigint: 'long?',
  decimal: 'decimal?',
  double: 'double?',
  money: 'Money',
  boolean: 'bool?',
  dateOnly: 'DateOnly?',
  dateTime: 'DateTime?',
  lookup: 'EntityReference',
  choice: 'OptionSetValue',
  multiChoice: 'OptionSetValueCollection',
  guid: 'Guid?',
  image: 'byte[]',
  file: 'Guid?',
  other: 'object',
}

const TYPESCRIPT_TYPES: Record<ColumnKind, string> = {
  string: 'string',
  memo: 'string',
  integer: 'number',
  bigint: 'number',
  decimal: 'number',
  double: 'number',
  money: 'number',
  boolean: 'boolean',
  dateOnly: 'string',
  dateTime: 'string',
  lookup: 'string',
  choice: 'number',
  multiChoice: 'number[]',
  guid: 'string',
  image: 'string',
  file: 'string',
  other: 'unknown',
}

export const columnKind = (
  column: Pick<CodegenColumn, 'attributeType' | 'typeName' | 'dateTimeBehavior'>,
): ColumnKind => {
  if (column.attributeType === 'DateTime') {
    return column.dateTimeBehavior === 'DateOnly' ? 'dateOnly' : 'dateTime'
  }
  if (column.attributeType === 'Virtual') {
    return VIRTUAL_KINDS[column.typeName] ?? 'other'
  }
  return ATTRIBUTE_KINDS[column.attributeType] ?? 'other'
}

export const csharpType = (kind: ColumnKind): string => CSHARP_TYPES[kind]

export const typescriptType = (kind: ColumnKind): string => TYPESCRIPT_TYPES[kind]

export const typeFor = (kind: ColumnKind, language: TemplateLanguage): string =>
  language === 'csharp' ? csharpType(kind) : typescriptType(kind)
