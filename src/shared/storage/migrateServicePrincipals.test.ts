import { describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { accessTokensItem, environmentsItem, schemaVersionItem, servicePrincipalsItem } from './items'
import {
  buildServicePrincipalMigration,
  type LegacyEnvironmentRecord,
  migrateServicePrincipals,
} from './migrateServicePrincipals'
import { LEGACY_SCHEMA_VERSION, SERVICE_PRINCIPAL_SCHEMA_VERSION } from './schema'

const legacy = (id: string, name: string, credentials: LegacyEnvironmentRecord['credentials']) => ({
  id,
  name,
  environmentType: 'Commercial' as const,
  modelDrivenAppUrl: `https://${id}.crm.dynamics.com/`,
  powerPagesUrl: '',
  environmentId: '',
  notes: '',
  credentials,
})

const environments: Record<string, LegacyEnvironmentRecord> = {
  uat: legacy('uat', 'UAT', { tenantId: 'T1', clientId: 'C1', clientSecret: 'other' }),
  dev: legacy('dev', 'Dev', { tenantId: 't1', clientId: 'c1', clientSecret: 'secret' }),
  prod: legacy('prod', 'Dev', { tenantId: 't2', clientId: 'c2', clientSecret: 'prod-secret' }),
  plain: legacy('plain', 'Plain', null),
  partial: legacy('partial', 'Partial', { tenantId: 't3', clientId: '', clientSecret: 'x' }),
}

describe('buildServicePrincipalMigration', () => {
  it('creates one principal per tenant and client, named after the first environment using it', () => {
    let counter = 0
    const result = buildServicePrincipalMigration(environments, {}, () => `sp-${++counter}`)
    expect(Object.values(result.servicePrincipals)).toEqual([
      { id: 'sp-1', name: 'Dev', tenantId: 't1', clientId: 'c1', clientSecret: 'secret', notes: '' },
      { id: 'sp-2', name: 'Dev (2)', tenantId: 't2', clientId: 'c2', clientSecret: 'prod-secret', notes: '' },
    ])
    expect(result.environments.dev).toEqual({
      id: 'dev',
      name: 'Dev',
      environmentType: 'Commercial',
      modelDrivenAppUrl: 'https://dev.crm.dynamics.com/',
      powerPagesUrl: '',
      environmentId: '',
      notes: '',
      servicePrincipalId: 'sp-1',
      alert: null,
    })
    expect(result.environments.uat?.servicePrincipalId).toBe('sp-1')
    expect(result.environments.prod?.servicePrincipalId).toBe('sp-2')
    expect(result.environments.plain?.servicePrincipalId).toBeNull()
    expect(result.environments.partial?.servicePrincipalId).toBeNull()
    expect(Object.values(result.environments).some((environment) => 'credentials' in environment)).toBe(false)
    expect(result.migrated).toBe(3)
  })

  it('reuses existing principals and is idempotent', () => {
    const first = buildServicePrincipalMigration(environments, {}, () => 'sp-a')
    const second = buildServicePrincipalMigration(
      first.environments as Record<string, LegacyEnvironmentRecord>,
      first.servicePrincipals,
      () => 'sp-b',
    )
    expect(second.migrated).toBe(0)
    expect(second.servicePrincipals).toEqual(first.servicePrincipals)
    expect(second.environments).toEqual(first.environments)
  })
})

describe('migrateServicePrincipals', () => {
  it('hoists inline credentials into principals once and clears cached tokens', async () => {
    await schemaVersionItem.setValue(LEGACY_SCHEMA_VERSION)
    await fakeBrowser.storage.local.set({
      environments: { dev: environments.dev, plain: environments.plain },
      environments$: { v: 2 },
      accessTokens: { stale: { token: 'x', expiresAt: 1 } },
    })
    expect(await migrateServicePrincipals()).toBe(true)
    const migrated = await environmentsItem.getValue()
    const principals = Object.values(await servicePrincipalsItem.getValue())
    expect(principals).toHaveLength(1)
    expect(migrated.dev?.servicePrincipalId).toBe(principals[0]?.id)
    expect('credentials' in (migrated.dev ?? {})).toBe(false)
    expect(await accessTokensItem.getValue()).toEqual({})
    expect(await schemaVersionItem.getValue()).toBe(SERVICE_PRINCIPAL_SCHEMA_VERSION)
    expect(await migrateServicePrincipals()).toBe(false)
  })
})
