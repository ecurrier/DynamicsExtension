import { requireLogicalName } from './guards'
import { type DataverseHttp } from './http'

export interface EntityRef {
  logicalName: string
  schemaName: string
  entitySetName: string
  primaryIdAttribute: string
  primaryNameAttribute: string | null
  objectTypeCode: number | null
  ownershipType: string | null
}

interface EntityRefRecord {
  LogicalName: string
  SchemaName?: string | null
  EntitySetName?: string | null
  PrimaryIdAttribute?: string | null
  PrimaryNameAttribute?: string | null
  ObjectTypeCode?: number | null
  OwnershipType?: string | null
}

const SELECT =
  'LogicalName,SchemaName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,ObjectTypeCode,OwnershipType'

const cache = new Map<string, Promise<EntityRef>>()

const load = async (http: DataverseHttp, logicalName: string): Promise<EntityRef> => {
  const record = await http.get<EntityRefRecord>(`EntityDefinitions(LogicalName='${logicalName}')?$select=${SELECT}`)
  return {
    logicalName: record.LogicalName,
    schemaName: record.SchemaName ?? record.LogicalName,
    entitySetName: record.EntitySetName ?? `${record.LogicalName}s`,
    primaryIdAttribute: record.PrimaryIdAttribute ?? `${record.LogicalName}id`,
    primaryNameAttribute: record.PrimaryNameAttribute ?? null,
    objectTypeCode: record.ObjectTypeCode ?? null,
    ownershipType: record.OwnershipType ?? null,
  }
}

export const resolveEntityRef = (http: DataverseHttp, entityLogicalName: string): Promise<EntityRef> => {
  const logicalName = requireLogicalName(entityLogicalName, 'Table')
  const key = `${http.origin}:${logicalName}`
  const cached = cache.get(key)
  if (cached) {
    return cached
  }
  const pending = load(http, logicalName).catch((error: unknown) => {
    cache.delete(key)
    throw error
  })
  cache.set(key, pending)
  return pending
}
