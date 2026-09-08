import {
  type CodegenChoice,
  type CodegenChoiceOption,
  type CodegenColumn,
  type CodegenLookupTarget,
  type CodegenOptionSet,
  type CodegenTable,
  type ColumnRequiredLevel,
  type DateTimeBehavior,
} from '@/shared/types'

import { DataverseOperationError } from './errors'
import { requireLogicalName } from './guards'
import { type DataverseHttp } from './http'
import { type ManyToOneRelationship, resolveLookupTargets } from './lookupTargets'
import { getAllPages } from './paging'

interface LabelRecord {
  UserLocalizedLabel?: { Label?: string | null } | null
  LocalizedLabels?: { Label?: string | null }[]
}

interface Page<T> {
  value?: T[]
}

interface OptionRecord {
  Value?: number | null
  Label?: LabelRecord
}

interface OptionSetRecord {
  Name?: string | null
  DisplayName?: LabelRecord
  IsGlobal?: boolean
  OptionSetType?: string
  Options?: OptionRecord[]
  TrueOption?: OptionRecord | null
  FalseOption?: OptionRecord | null
}

interface EntityRecord {
  LogicalName: string
  SchemaName?: string
  DisplayName?: LabelRecord
  DisplayCollectionName?: LabelRecord
  EntitySetName?: string | null
  PrimaryIdAttribute?: string
  PrimaryNameAttribute?: string | null
  IsCustomEntity?: boolean
}

interface AttributeRecord {
  LogicalName: string
  SchemaName?: string
  DisplayName?: LabelRecord
  AttributeType?: string
  AttributeTypeName?: { Value?: string }
  AttributeOf?: string | null
  IsPrimaryId?: boolean
  IsPrimaryName?: boolean
  IsCustomAttribute?: boolean
  IsLogical?: boolean
  IsValidForCreate?: boolean
  IsValidForUpdate?: boolean
  IsValidForRead?: boolean
  RequiredLevel?: { Value?: string }
}

interface TypedAttributeRecord {
  LogicalName: string
  MaxLength?: number | null
  Precision?: number | null
  DateTimeBehavior?: { Value?: string } | null
  Format?: string | null
  Targets?: string[]
  OptionSet?: OptionSetRecord | null
}

const ENTITY_SELECT =
  'LogicalName,SchemaName,DisplayName,DisplayCollectionName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,IsCustomEntity'
const ATTRIBUTE_SELECT =
  'LogicalName,SchemaName,DisplayName,AttributeType,AttributeTypeName,AttributeOf,IsPrimaryId,IsPrimaryName,IsCustomAttribute,IsLogical,IsValidForCreate,IsValidForUpdate,IsValidForRead,RequiredLevel'
const TYPED_READS = [
  { type: 'StringAttributeMetadata', select: 'LogicalName,MaxLength' },
  { type: 'MemoAttributeMetadata', select: 'LogicalName,MaxLength' },
  { type: 'DecimalAttributeMetadata', select: 'LogicalName,Precision' },
  { type: 'DoubleAttributeMetadata', select: 'LogicalName,Precision' },
  { type: 'MoneyAttributeMetadata', select: 'LogicalName,Precision' },
  { type: 'DateTimeAttributeMetadata', select: 'LogicalName,DateTimeBehavior,Format' },
  { type: 'LookupAttributeMetadata', select: 'LogicalName,Targets' },
]
const OPTION_SET_TYPES = [
  'PicklistAttributeMetadata',
  'MultiSelectPicklistAttributeMetadata',
  'StateAttributeMetadata',
  'StatusAttributeMetadata',
  'BooleanAttributeMetadata',
]
const REQUIRED_LEVELS: ColumnRequiredLevel[] = ['None', 'SystemRequired', 'ApplicationRequired', 'Recommended']
const BEHAVIORS: DateTimeBehavior[] = ['UserLocal', 'DateOnly', 'TimeZoneIndependent']
const TARGET_CHUNK = 15

const labelText = (label: LabelRecord | undefined, fallback: string): string =>
  label?.UserLocalizedLabel?.Label ?? label?.LocalizedLabels?.[0]?.Label ?? fallback

const toOptions = (record: OptionSetRecord): CodegenChoiceOption[] => {
  const source = record.Options?.length ? record.Options : [record.FalseOption, record.TrueOption]
  return source.flatMap((option) =>
    option && typeof option.Value === 'number'
      ? [{ value: option.Value, label: labelText(option.Label, String(option.Value)) }]
      : [],
  )
}

const toOptionSet = (record: OptionSetRecord | null | undefined): CodegenOptionSet | null =>
  record?.Name
    ? {
        name: record.Name,
        displayName: labelText(record.DisplayName, record.Name),
        isGlobal: record.IsGlobal === true,
        options: toOptions(record),
      }
    : null

const requiredLevel = (value: string | undefined): ColumnRequiredLevel =>
  REQUIRED_LEVELS.find((level) => level === value) ?? 'None'

const behavior = (value: string | undefined): DateTimeBehavior | null =>
  BEHAVIORS.find((candidate) => candidate === value) ?? null

const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))

const toColumn = (
  record: AttributeRecord,
  typed: Map<string, TypedAttributeRecord>,
  entitySets: Map<string, string>,
  relationships: ManyToOneRelationship[],
): CodegenColumn => {
  const extra = typed.get(record.LogicalName)
  const format = extra?.Format
  return {
    logicalName: record.LogicalName,
    schemaName: record.SchemaName ?? record.LogicalName,
    displayName: labelText(record.DisplayName, record.LogicalName),
    attributeType: record.AttributeType ?? 'Virtual',
    typeName: record.AttributeTypeName?.Value ?? '',
    attributeOf: record.AttributeOf ?? null,
    isPrimaryId: record.IsPrimaryId === true,
    isPrimaryName: record.IsPrimaryName === true,
    isCustom: record.IsCustomAttribute === true,
    isLogical: record.IsLogical === true,
    isValidForCreate: record.IsValidForCreate === true,
    isValidForUpdate: record.IsValidForUpdate === true,
    isValidForRead: record.IsValidForRead !== false,
    requiredLevel: requiredLevel(record.RequiredLevel?.Value),
    maxLength: extra?.MaxLength ?? null,
    precision: extra?.Precision ?? null,
    dateTimeBehavior: behavior(extra?.DateTimeBehavior?.Value),
    dateTimeFormat: format === 'DateOnly' || format === 'DateAndTime' ? format : null,
    targets: resolveLookupTargets(
      record.LogicalName,
      record.AttributeType ?? '',
      extra?.Targets ?? [],
      relationships,
    ).map<CodegenLookupTarget>((target) => ({
      ...target,
      entitySetName: entitySets.get(target.logicalName) ?? null,
    })),
    optionSet: toOptionSet(extra?.OptionSet),
  }
}

const toChoice = (record: OptionSetRecord): CodegenChoice | null =>
  record.Name
    ? {
        name: record.Name,
        displayName: labelText(record.DisplayName, record.Name),
        isGlobal: true,
        tableLogicalName: null,
        columnLogicalName: null,
        options: toOptions(record),
      }
    : null

export interface CodegenOperations {
  getTableModel: (request: { entityLogicalName: string }) => Promise<CodegenTable>
  getGlobalChoices: () => Promise<CodegenChoice[]>
}

export const codegenOperations = (http: DataverseHttp): CodegenOperations => {
  const readTyped = (base: string, type: string, query: string) =>
    http
      .get<Page<TypedAttributeRecord> | undefined>(`${base}/Attributes/Microsoft.Dynamics.CRM.${type}?${query}`)
      .then((page) => page?.value ?? [])
      .catch(() => [] as TypedAttributeRecord[])

  const readEntitySets = async (logicalNames: string[]): Promise<Map<string, string>> => {
    const pages = await Promise.all(
      chunk(logicalNames, TARGET_CHUNK).map((names) =>
        http
          .get<Page<EntityRecord> | undefined>(
            `EntityDefinitions?$select=LogicalName,EntitySetName&$filter=${names.map((name) => `LogicalName eq '${name}'`).join(' or ')}`,
          )
          .then((page) => page?.value ?? [])
          .catch(() => [] as EntityRecord[]),
      ),
    )
    return new Map(
      pages.flat().flatMap((record) => (record.EntitySetName ? [[record.LogicalName, record.EntitySetName]] : [])),
    )
  }

  return {
    getTableModel: async ({ entityLogicalName }) => {
      const table = requireLogicalName(entityLogicalName, 'Table')
      const base = `EntityDefinitions(LogicalName='${table}')`
      const [entity, attributes, relationships, ...typedPages] = await Promise.all([
        http.get<EntityRecord | undefined>(`${base}?$select=${ENTITY_SELECT}`),
        http
          .get<Page<AttributeRecord> | undefined>(`${base}/Attributes?$select=${ATTRIBUTE_SELECT}`)
          .then((page) => page?.value ?? []),
        http
          .get<Page<ManyToOneRelationship> | undefined>(
            `${base}/ManyToOneRelationships?$select=ReferencingAttribute,ReferencedEntity,ReferencingEntityNavigationPropertyName`,
          )
          .then((page) => page?.value ?? [])
          .catch(() => [] as ManyToOneRelationship[]),
        ...TYPED_READS.map((read) => readTyped(base, read.type, `$select=${read.select}`)),
        ...OPTION_SET_TYPES.map((type) => readTyped(base, type, '$select=LogicalName&$expand=OptionSet')),
      ])
      if (!entity) {
        throw new DataverseOperationError('NotFound', `The table ${table} does not exist in this environment`)
      }
      const typed = new Map<string, TypedAttributeRecord>()
      for (const record of typedPages.flat()) {
        typed.set(record.LogicalName, { ...typed.get(record.LogicalName), ...record })
      }
      const targetNames = [...new Set(typedPages.flat().flatMap((record) => record.Targets ?? []))].sort()
      const entitySets = targetNames.length > 0 ? await readEntitySets(targetNames) : new Map<string, string>()
      return {
        logicalName: entity.LogicalName,
        schemaName: entity.SchemaName ?? entity.LogicalName,
        displayName: labelText(entity.DisplayName, entity.LogicalName),
        displayCollectionName: labelText(entity.DisplayCollectionName, entity.EntitySetName ?? entity.LogicalName),
        entitySetName: entity.EntitySetName ?? '',
        primaryIdAttribute: entity.PrimaryIdAttribute ?? '',
        primaryNameAttribute: entity.PrimaryNameAttribute ?? null,
        isCustom: entity.IsCustomEntity === true,
        columns: attributes
          .map((record) => toColumn(record, typed, entitySets, relationships))
          .sort((left, right) => left.logicalName.localeCompare(right.logicalName)),
      }
    },
    getGlobalChoices: async () => {
      const page = await getAllPages<OptionSetRecord>(http, 'GlobalOptionSetDefinitions')
      return page.rows
        .filter((record) => record.OptionSetType === 'Picklist')
        .flatMap((record) => {
          const choice = toChoice(record)
          return choice ? [choice] : []
        })
        .sort((left, right) => left.displayName.localeCompare(right.displayName))
    },
  }
}
