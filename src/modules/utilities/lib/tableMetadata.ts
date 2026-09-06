import { type TableMetadata, type TableRelationship } from '@/shared/types'

export interface MetadataFact {
  label: string
  value: string
}

const yesNo = (value: boolean): string => (value ? 'Yes' : 'No')

export const metadataFacts = (metadata: TableMetadata): MetadataFact[] => [
  { label: 'Logical name', value: metadata.logicalName },
  { label: 'Schema name', value: metadata.schemaName },
  { label: 'Entity set', value: metadata.entitySetName || '—' },
  { label: 'Collection name', value: metadata.collectionDisplayName ?? '—' },
  { label: 'Primary id', value: metadata.primaryIdAttribute || '—' },
  { label: 'Primary name', value: metadata.primaryNameAttribute ?? '—' },
  { label: 'Object type code', value: metadata.objectTypeCode === null ? '—' : String(metadata.objectTypeCode) },
  { label: 'Ownership', value: metadata.ownershipType ?? '—' },
  { label: 'Columns', value: metadata.attributeCount === null ? '—' : String(metadata.attributeCount) },
  { label: 'Managed', value: yesNo(metadata.isManaged) },
  { label: 'Custom table', value: yesNo(metadata.isCustomEntity) },
  { label: 'Auditing', value: yesNo(metadata.isAuditEnabled) },
  { label: 'Change tracking', value: yesNo(metadata.changeTrackingEnabled) },
  { label: 'Activity table', value: yesNo(metadata.isActivity) },
  { label: 'Quick create', value: yesNo(metadata.isQuickCreateEnabled) },
  { label: 'Advanced find', value: yesNo(metadata.isValidForAdvancedFind) },
  { label: 'Notes', value: yesNo(metadata.hasNotes) },
  { label: 'Activities', value: yesNo(metadata.hasActivities) },
]

export const relationshipMatches = (relationship: TableRelationship, filter: string): boolean => {
  const term = filter.trim().toLowerCase()
  if (!term) {
    return true
  }
  return [
    relationship.schemaName,
    relationship.kind,
    relationship.relatedEntity,
    relationship.navigationProperty ?? '',
    relationship.referencingAttribute ?? '',
    relationship.intersectEntity ?? '',
  ]
    .join(' ')
    .toLowerCase()
    .includes(term)
}

export const metadataToText = (metadata: TableMetadata): string => {
  const facts = metadataFacts(metadata)
    .map((fact) => `${fact.label}: ${fact.value}`)
    .join('\n')
  const keys =
    metadata.keys.length > 0
      ? `\n\nAlternate keys:\n${metadata.keys
          .map((key) => `- ${key.displayName ?? key.logicalName}: ${key.attributes.join(', ')} (${key.statusLabel})`)
          .join('\n')}`
      : ''
  const relationships =
    metadata.relationships.length > 0
      ? `\n\nRelationships:\n${metadata.relationships
          .map(
            (relationship) =>
              `- ${relationship.kind} ${relationship.relatedEntity}` +
              `${relationship.navigationProperty ? ` via ${relationship.navigationProperty}` : ''}` +
              `${relationship.intersectEntity ? ` (intersect ${relationship.intersectEntity})` : ''}`,
          )
          .join('\n')}`
      : ''
  return `${facts}${keys}${relationships}`
}
