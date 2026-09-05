import { describe, expect, it } from 'vitest'

import {
  draftFromDetails,
  draftFromEnvironment,
  EMPTY_DRAFT,
  type EnvironmentDraft,
  sortEnvironments,
  toEnvironment,
  validateDraft,
} from './environmentDraft'

const draft = (overrides: Partial<EnvironmentDraft>): EnvironmentDraft => ({ ...EMPTY_DRAFT, ...overrides })

describe('environmentDraft', () => {
  it('requires a name', () => {
    expect(validateDraft(draft({ name: '  ', environmentType: 'GCC' }))).toEqual({
      field: 'name',
      message: 'Enter an environment name',
    })
    expect(validateDraft(draft({ name: 'Dev', environmentType: 'GCC' }))).toBeNull()
  })

  it('requires a complete credential set with an https url', () => {
    expect(validateDraft(draft({ name: 'Dev', clientId: 'app' }))).toEqual({
      field: 'modelDrivenAppUrl',
      message: 'Enter the https URL of the environment to use client credentials',
    })
    expect(
      validateDraft(draft({ name: 'Dev', modelDrivenAppUrl: 'https://dev.crm.dynamics.com/', clientId: 'app' })),
    ).toEqual({ field: 'credentials', message: 'Enter the tenant id, client id, and client secret together' })
    expect(
      validateDraft(
        draft({
          name: 'Dev',
          modelDrivenAppUrl: 'https://dev.crm.dynamics.com/',
          tenantId: 't',
          clientId: 'app',
          clientSecret: 's',
        }),
      ),
    ).toBeNull()
  })

  it('round-trips an environment and trims values', () => {
    const environment = toEnvironment('id-1', {
      name: ' Dev ',
      environmentType: 'DOD',
      modelDrivenAppUrl: ' https://dev.crm.dynamics.com/ ',
      powerPagesUrl: '',
      environmentId: 'env ',
      tenantId: ' tenant ',
      clientId: 'client',
      clientSecret: ' secret ',
      notes: ' admin org ',
    })
    expect(environment).toEqual({
      id: 'id-1',
      name: 'Dev',
      environmentType: 'DOD',
      modelDrivenAppUrl: 'https://dev.crm.dynamics.com/',
      powerPagesUrl: '',
      environmentId: 'env',
      notes: 'admin org',
      credentials: { tenantId: 'tenant', clientId: 'client', clientSecret: 'secret' },
    })
    expect(draftFromEnvironment(environment)).toMatchObject({
      name: 'Dev',
      environmentType: 'DOD',
      tenantId: 'tenant',
      clientSecret: 'secret',
      notes: 'admin org',
    })
    expect(toEnvironment('id-2', draft({ name: 'Plain' })).credentials).toBeNull()
  })

  it('builds a draft from page environment details', () => {
    expect(draftFromDetails(null).environmentType).toBe('Commercial')
    expect(
      draftFromDetails({
        environmentName: 'org1',
        environmentId: 'abc',
        environmentType: 'GCCHigh',
        modelDrivenAppUrl: 'https://org1.crm.dynamics.com/',
        powerPagesUrl: null,
        geographicalRegion: null,
        organizationId: null,
        tenantId: 'tenant-1',
        blockedAttachments: null,
        baseCurrency: null,
      }),
    ).toEqual({
      ...EMPTY_DRAFT,
      name: 'org1',
      environmentType: 'GCCHigh',
      modelDrivenAppUrl: 'https://org1.crm.dynamics.com/',
      environmentId: 'abc',
      tenantId: 'tenant-1',
    })
  })

  it('sorts environments by name', () => {
    const sorted = sortEnvironments([
      toEnvironment('1', draft({ name: 'Zeta' })),
      toEnvironment('2', draft({ name: 'alpha' })),
    ])
    expect(sorted.map((environment) => environment.id)).toEqual(['2', '1'])
  })
})
