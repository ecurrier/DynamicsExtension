import { defineHandlers, PageError } from '@/messaging/page'
import {
  type AttributeMetadataRecord,
  fetchAllOptionSetAttributes,
  fetchEntityInfo,
  fetchJson,
  getEntityId,
  getFormContext,
  getXrm,
  labelText,
  retrieveMultiple,
  retrieveMultipleOData,
} from '@/page/xrm'
import {
  buildRecordSearchQuery,
  type ManyToOneRelationship,
  mapRecordSearchRows,
  resolveLookupTargets,
} from '@/shared/lib'
import {
  type AttributeDefinition,
  type AttributeMetadataBundle,
  type AttributeType,
  type ChoiceOption,
  type EntityInfo,
  type RecordSearchResult,
} from '@/shared/types'

const FORM_TYPE_CREATE = 1

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

const SUPPORTED_TYPES: readonly AttributeType[] = [
  'BigInt',
  'Boolean',
  'Customer',
  'DateTime',
  'Decimal',
  'Double',
  'Integer',
  'Lookup',
  'Memo',
  'Money',
  'Owner',
  'Picklist',
  'State',
  'Status',
  'String',
  'Virtual',
]

const isSupportedType = (value: string): value is AttributeType =>
  (SUPPORTED_TYPES as readonly string[]).includes(value)

const isSelectable = (attribute: AttributeMetadataRecord): boolean =>
  attribute.AttributeOf == null &&
  isSupportedType(attribute.AttributeType) &&
  (attribute.AttributeType !== 'Virtual' || attribute.AttributeTypeName?.Value === 'MultiSelectPicklistType')

const requireIdentifier = (value: string, label: string): string => {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new PageError('InvalidArgument', `${label} is not a valid name`)
  }
  return value
}

const toOptions = (attribute: AttributeMetadataRecord | undefined): ChoiceOption[] => {
  if (!attribute?.OptionSet) {
    return []
  }
  const source =
    attribute.AttributeType === 'Boolean'
      ? [attribute.OptionSet.FalseOption, attribute.OptionSet.TrueOption].filter((option) => !!option)
      : (attribute.OptionSet.Options ?? [])
  return source.map((option) => ({ value: option.Value, label: labelText(option.Label) ?? String(option.Value) }))
}

const toDateTimeFormat = (format: string | undefined): AttributeDefinition['dateTimeFormat'] =>
  format === 'DateOnly' || format === 'DateAndTime' ? format : null

const buildDefinitions = (
  attributes: AttributeMetadataRecord[],
  optionSetAttributes: AttributeMetadataRecord[],
  dateTimeAttributes: AttributeMetadataRecord[],
  relationships: ManyToOneRelationship[],
): AttributeDefinition[] => {
  const optionSetsByName = new Map(optionSetAttributes.map((attribute) => [attribute.LogicalName, attribute]))
  const dateFormatsByName = new Map(dateTimeAttributes.map((attribute) => [attribute.LogicalName, attribute.Format]))
  return attributes
    .filter(isSelectable)
    .map((attribute) => ({
      logicalName: attribute.LogicalName,
      displayName: labelText(attribute.DisplayName) ?? attribute.LogicalName,
      attributeType: attribute.AttributeType as AttributeType,
      targets: resolveLookupTargets(
        attribute.LogicalName,
        attribute.AttributeType,
        attribute.Targets ?? [],
        relationships,
      ),
      options: toOptions(optionSetsByName.get(attribute.LogicalName)),
      dateTimeFormat: toDateTimeFormat(dateFormatsByName.get(attribute.LogicalName)),
    }))
    .sort((left, right) => left.logicalName.localeCompare(right.logicalName))
}

const extractEntityName = (fetchXml: string): string => {
  const match = fetchXml.match(/<entity[^>]*name=['"]([^'"]*)['"]/)
  const entityName = match?.[1]
  if (!entityName) {
    throw new PageError('EntityNameNotFound', 'Could not find an entity name in the Fetch XML')
  }
  return entityName
}

const entityInfoCache = new Map<string, Promise<EntityInfo>>()

const getEntityInfo = (logicalName: string): Promise<EntityInfo> => {
  const cached = entityInfoCache.get(logicalName)
  if (cached) {
    return cached
  }
  const pending = fetchEntityInfo(logicalName).catch((error: unknown) => {
    entityInfoCache.delete(logicalName)
    throw error
  })
  entityInfoCache.set(logicalName, pending)
  return pending
}

const searchRecords = async (info: EntityInfo, query: string, top: number): Promise<RecordSearchResult[]> => {
  const withModifiedOn = buildRecordSearchQuery(info, query, top, true)
  if (!withModifiedOn) {
    throw new PageError('NotSupported', `${info.displayName} has no primary name column to search`)
  }
  try {
    return mapRecordSearchRows(info, await retrieveMultipleOData(info.logicalName, withModifiedOn))
  } catch (error) {
    const withoutModifiedOn = buildRecordSearchQuery(info, query, top, false)
    if (!withoutModifiedOn) {
      throw error
    }
    return mapRecordSearchRows(info, await retrieveMultipleOData(info.logicalName, withoutModifiedOn))
  }
}

const requireSavedRecord = (): Xrm.Page => {
  const formContext = getFormContext()
  if (formContext.ui.getFormType() === FORM_TYPE_CREATE) {
    throw new PageError('NotSupported', 'Save the record before updating fields through the Web API')
  }
  return formContext
}

export const webApiHandlers = defineHandlers({
  'webapi.getAttributeMetadata': async (): Promise<AttributeMetadataBundle> => {
    const formContext = getFormContext()
    const entityName = formContext.data.entity.getEntityName()
    const [definition, optionSetAttributes, dateTimeAttributes, relationships] = await Promise.all([
      fetchJson<{ Attributes: AttributeMetadataRecord[] }>(
        `EntityDefinitions(LogicalName='${entityName}')?$select=LogicalName&$expand=Attributes($filter=AttributeType ne 'Uniqueidentifier')`,
      ),
      fetchAllOptionSetAttributes(entityName),
      fetchJson<{ value: AttributeMetadataRecord[] }>(
        `EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.DateTimeAttributeMetadata?$select=LogicalName,Format`,
      ).then((response) => response.value),
      fetchJson<{ value: ManyToOneRelationship[] }>(
        `EntityDefinitions(LogicalName='${entityName}')/ManyToOneRelationships?$select=ReferencingAttribute,ReferencedEntity,ReferencingEntityNavigationPropertyName`,
      ).then((response) => response.value),
    ])
    return {
      entityName,
      entityId: getEntityId(formContext),
      attributes: buildDefinitions(definition.Attributes, optionSetAttributes, dateTimeAttributes, relationships),
    }
  },
  'webapi.getRecordValues': async () => {
    const formContext = getFormContext()
    const record = await getXrm().WebApi.retrieveRecord(
      formContext.data.entity.getEntityName(),
      getEntityId(formContext),
    )
    return (record ?? {}) as Record<string, unknown>
  },
  'webapi.updateField': async ({ payload }) => {
    const formContext = requireSavedRecord()
    const response = await getXrm().WebApi.updateRecord(
      formContext.data.entity.getEntityName(),
      getEntityId(formContext),
      payload,
    )
    if (!response?.entityType) {
      throw new PageError('XrmError', 'The update did not return a result')
    }
  },
  'webapi.clearLookup': async ({ navigationProperty }) => {
    const formContext = requireSavedRecord()
    const navigation = requireIdentifier(navigationProperty, 'Navigation property')
    const info = await getEntityInfo(formContext.data.entity.getEntityName())
    await fetchJson<void>(`${info.entitySetName}(${getEntityId(formContext)})/${navigation}/$ref`, {
      method: 'DELETE',
    })
  },
  'webapi.getEntityInfo': ({ logicalName }) => {
    getXrm()
    return getEntityInfo(requireIdentifier(logicalName, 'Table name'))
  },
  'webapi.searchRecords': async ({ entityLogicalName, query, top }) => {
    getXrm()
    const info = await getEntityInfo(requireIdentifier(entityLogicalName, 'Table name'))
    return searchRecords(info, query, Math.min(Math.max(1, Math.trunc(top)), 100))
  },
  'webapi.executeFetchXml': async ({ fetchXml }) => {
    getXrm()
    return retrieveMultiple(extractEntityName(fetchXml), fetchXml)
  },
})
