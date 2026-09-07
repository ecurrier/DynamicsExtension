import { type LookupTarget } from './dynamics'

export interface EntitySummary {
  logicalName: string
  displayName: string
  entitySetName: string
  primaryIdAttribute: string
  primaryNameAttribute: string | null
}

export interface SavedView {
  id: string
  name: string
  fetchXml: string
  queryType: number
  isDefault: boolean
}

export interface TransportAttribute {
  logicalName: string
  displayName: string
  attributeType: string
  attributeOf: string | null
  isPrimaryId: boolean
  isValidForCreate: boolean
  isValidForUpdate: boolean
  isLogical: boolean
  targets: LookupTarget[]
}

export interface TransportEntityMetadata {
  info: EntitySummary
  attributes: TransportAttribute[]
}

export type TransportRow = Record<string, unknown>

export interface RetrievePageRequest {
  entitySetName: string
  fetchXml: string | null
  nextLink: string | null
  pageSize: number
}

export interface RetrievePageResult {
  rows: TransportRow[]
  nextLink: string | null
}

export interface ExistingIdsRequest {
  entityLogicalName: string
  entitySetName: string
  primaryIdAttribute: string
  ids: string[]
}

export interface CreateRecordRequest {
  entitySetName: string
  payload: Record<string, unknown>
}

export interface UpdateRecordRequest {
  entitySetName: string
  id: string
  payload: Record<string, unknown>
}

export interface DeleteRecordRequest {
  entitySetName: string
  id: string
}

export interface TransporterLaunch {
  tabId: number | null
  orgOrigin: string | null
  environmentName: string | null
  launchedAt: string
}
