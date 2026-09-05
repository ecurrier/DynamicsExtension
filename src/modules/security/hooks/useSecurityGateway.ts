import { type QueryKey } from '@tanstack/react-query'
import { useMemo } from 'react'

import { invoke, PageCommandError, pageKeys } from '@/messaging/client'
import { type CommandName } from '@/messaging/contract'
import { useEnvironments } from '@/modules/settings'
import { connectionKeys, type ConnectionTarget, getEnvironmentHttp } from '@/shared/connections'
import { securityOperations } from '@/shared/lib'
import { type Environment } from '@/shared/storage'
import { useSessionStore } from '@/shared/stores'
import {
  type BusinessUnit,
  type CurrentUser,
  type RoleChangeSet,
  type SecurityRole,
  type SystemUser,
} from '@/shared/types'

export type SecurityOperationName =
  | 'getSecurityRoles'
  | 'getBusinessUnits'
  | 'searchSystemUsers'
  | 'getUserSecurityRoles'
  | 'applySecurityRoleChanges'
  | 'getCurrentUser'

export interface SecurityGateway {
  mode: 'page' | 'environment'
  ready: boolean
  environment: Environment | null
  key: (name: SecurityOperationName, args?: unknown) => QueryKey
  getSecurityRoles: () => Promise<SecurityRole[]>
  getBusinessUnits: () => Promise<BusinessUnit[]>
  searchSystemUsers: (query: string) => Promise<SystemUser[]>
  getUserSecurityRoles: (systemUserId: string, businessUnitId: string) => Promise<SecurityRole[]>
  applySecurityRoleChanges: (changes: RoleChangeSet) => Promise<void>
  getCurrentUser: (() => Promise<CurrentUser>) | null
}

const APPLY_TIMEOUT_MS = 120_000

const pageGateway = (tabId: number | null, ready: boolean): SecurityGateway => {
  const requireTab = (name: CommandName): number => {
    if (tabId === null) {
      throw new PageCommandError(name, 'NoActiveTab', 'No active browser tab was found')
    }
    return tabId
  }
  return {
    mode: 'page',
    ready,
    environment: null,
    key: (name, args) => [...pageKeys.tab(tabId ?? -1), `security.${name}`, args ?? null],
    getSecurityRoles: () => invoke(requireTab('security.getSecurityRoles'), 'security.getSecurityRoles', undefined),
    getBusinessUnits: () => invoke(requireTab('security.getBusinessUnits'), 'security.getBusinessUnits', undefined),
    searchSystemUsers: (query) =>
      invoke(requireTab('security.searchSystemUsers'), 'security.searchSystemUsers', { query }),
    getUserSecurityRoles: (systemUserId, businessUnitId) =>
      invoke(requireTab('security.getUserSecurityRoles'), 'security.getUserSecurityRoles', {
        systemUserId,
        businessUnitId,
      }),
    applySecurityRoleChanges: (changes) =>
      invoke(requireTab('security.applySecurityRoleChanges'), 'security.applySecurityRoleChanges', changes, {
        timeoutMs: APPLY_TIMEOUT_MS,
      }),
    getCurrentUser: () => invoke(requireTab('security.getCurrentUser'), 'security.getCurrentUser', undefined),
  }
}

const missingEnvironmentGateway = (): SecurityGateway => {
  const missing = () => Promise.reject(new Error('The selected environment no longer exists'))
  return {
    mode: 'environment',
    ready: false,
    environment: null,
    key: (name, args) => connectionKeys.operation('missing', name, args),
    getSecurityRoles: missing,
    getBusinessUnits: missing,
    searchSystemUsers: missing,
    getUserSecurityRoles: missing,
    applySecurityRoleChanges: missing,
    getCurrentUser: null,
  }
}

const environmentGateway = (environment: Environment): SecurityGateway => {
  const operations = () => getEnvironmentHttp(environment).then(securityOperations)
  return {
    mode: 'environment',
    ready: true,
    environment,
    key: (name, args) => connectionKeys.operation(environment.id, name, args),
    getSecurityRoles: () => operations().then((ops) => ops.getSecurityRoles()),
    getBusinessUnits: () => operations().then((ops) => ops.getBusinessUnits()),
    searchSystemUsers: (query) => operations().then((ops) => ops.searchSystemUsers(query)),
    getUserSecurityRoles: (systemUserId, businessUnitId) =>
      operations().then((ops) => ops.getUserSecurityRoles(systemUserId, businessUnitId)),
    applySecurityRoleChanges: (changes) => operations().then((ops) => ops.applySecurityRoleChanges(changes)),
    getCurrentUser: null,
  }
}

export const useSecurityGateway = (connection: ConnectionTarget): SecurityGateway => {
  const tabId = useSessionStore((state) => state.tabId)
  const bridgeStatus = useSessionStore((state) => state.bridgeStatus)
  const { byId } = useEnvironments()
  const environment = connection.kind === 'environment' ? (byId[connection.environmentId] ?? null) : null
  return useMemo(() => {
    if (connection.kind === 'page') {
      return pageGateway(tabId, tabId !== null && bridgeStatus === 'ready')
    }
    return environment ? environmentGateway(environment) : missingEnvironmentGateway()
  }, [connection.kind, environment, tabId, bridgeStatus])
}
