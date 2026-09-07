import { type LookupTarget } from '@/shared/types'

export interface ManyToOneRelationship {
  ReferencingAttribute: string
  ReferencedEntity: string
  ReferencingEntityNavigationPropertyName: string
}

const fallbackNavigationProperty = (attributeLogicalName: string, target: string, targetCount: number): string =>
  targetCount > 1 ? `${attributeLogicalName}_${target}` : attributeLogicalName

const resolveNavigationProperty = (
  attributeLogicalName: string,
  attributeType: string,
  target: string,
  targetCount: number,
  relationships: readonly ManyToOneRelationship[],
): string => {
  if (attributeType === 'Owner') {
    return attributeLogicalName
  }
  const match = relationships.find(
    (relationship) =>
      relationship.ReferencingAttribute === attributeLogicalName && relationship.ReferencedEntity === target,
  )
  return (
    match?.ReferencingEntityNavigationPropertyName ||
    fallbackNavigationProperty(attributeLogicalName, target, targetCount)
  )
}

export const resolveLookupTargets = (
  attributeLogicalName: string,
  attributeType: string,
  targets: readonly string[],
  relationships: readonly ManyToOneRelationship[],
): LookupTarget[] =>
  targets.map((target) => ({
    logicalName: target,
    navigationProperty: resolveNavigationProperty(
      attributeLogicalName,
      attributeType,
      target,
      targets.length,
      relationships,
    ),
  }))
