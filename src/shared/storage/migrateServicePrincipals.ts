import { storage } from 'wxt/utils/storage'

import { generateGuid } from '@/shared/lib'

import { accessTokensItem, environmentsItem, schemaVersionItem, servicePrincipalsItem } from './items'
import {
  type Environment,
  type Environments,
  SERVICE_PRINCIPAL_SCHEMA_VERSION,
  type ServicePrincipal,
  type ServicePrincipals,
} from './schema'

interface LegacyCredentials {
  tenantId?: string | null
  clientId?: string | null
  clientSecret?: string | null
}

export type LegacyEnvironmentRecord = Partial<Environment> & {
  id: string
  name: string
  credentials?: LegacyCredentials | null
}

export interface ServicePrincipalMigration {
  environments: Environments
  servicePrincipals: ServicePrincipals
  migrated: number
}

const principalKey = (tenantId: string, clientId: string): string =>
  `${tenantId.trim().toLowerCase()}|${clientId.trim().toLowerCase()}`

const uniqueName = (preferred: string, used: Set<string>): string => {
  let candidate = preferred
  let suffix = 2
  while (used.has(candidate.toLowerCase())) {
    candidate = `${preferred} (${suffix})`
    suffix += 1
  }
  used.add(candidate.toLowerCase())
  return candidate
}

export const buildServicePrincipalMigration = (
  environments: Record<string, LegacyEnvironmentRecord>,
  existing: ServicePrincipals,
  newId: () => string = generateGuid,
): ServicePrincipalMigration => {
  const servicePrincipals: ServicePrincipals = { ...existing }
  const byKey = new Map(
    Object.values(existing).map((principal) => [principalKey(principal.tenantId, principal.clientId), principal]),
  )
  const usedNames = new Set(Object.values(existing).map((principal) => principal.name.toLowerCase()))
  const migratedEnvironments: Environments = {}
  let migrated = 0
  const sorted = Object.values(environments).sort((left, right) => left.name.localeCompare(right.name))
  for (const environment of sorted) {
    const { credentials, ...rest } = environment
    const next: Environment = {
      environmentType: 'Commercial',
      modelDrivenAppUrl: '',
      powerPagesUrl: '',
      environmentId: '',
      notes: '',
      ...rest,
      servicePrincipalId: rest.servicePrincipalId ?? null,
      alert: rest.alert ?? null,
    }
    const tenantId = credentials?.tenantId?.trim() ?? ''
    const clientId = credentials?.clientId?.trim() ?? ''
    if (tenantId && clientId) {
      const key = principalKey(tenantId, clientId)
      let principal = byKey.get(key)
      if (!principal) {
        const fallbackName = `${tenantId.slice(0, 8)} / ${clientId.slice(0, 8)}`
        const created: ServicePrincipal = {
          id: newId(),
          name: uniqueName(environment.name.trim() || fallbackName, usedNames),
          tenantId,
          clientId,
          clientSecret: credentials?.clientSecret?.trim() ?? '',
          notes: '',
        }
        servicePrincipals[created.id] = created
        byKey.set(key, created)
        principal = created
      }
      next.servicePrincipalId = principal.id
      migrated += 1
    }
    migratedEnvironments[environment.id] = next
  }
  return { environments: migratedEnvironments, servicePrincipals, migrated }
}

export const migrateServicePrincipals = async (): Promise<boolean> => {
  if ((await schemaVersionItem.getValue()) >= SERVICE_PRINCIPAL_SCHEMA_VERSION) {
    return false
  }
  const environments = (await environmentsItem.getValue()) as Record<string, LegacyEnvironmentRecord>
  const existing = await servicePrincipalsItem.getValue()
  const result = buildServicePrincipalMigration(environments, existing)
  await storage.setItems([
    { item: environmentsItem, value: result.environments },
    { item: servicePrincipalsItem, value: result.servicePrincipals },
    { item: accessTokensItem, value: {} },
  ])
  await schemaVersionItem.setValue(SERVICE_PRINCIPAL_SCHEMA_VERSION)
  return result.migrated > 0
}
