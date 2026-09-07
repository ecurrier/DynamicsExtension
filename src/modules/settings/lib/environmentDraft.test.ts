import { describe, expect, it } from 'vitest'

import {
  copyDraft,
  defaultAlert,
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

  it('requires an https url when a service principal is assigned', () => {
    expect(validateDraft(draft({ name: 'Dev', servicePrincipalId: 'sp-1' }))).toEqual({
      field: 'modelDrivenAppUrl',
      message: 'Enter the https URL of the environment to use a service principal',
    })
    expect(
      validateDraft(
        draft({ name: 'Dev', servicePrincipalId: 'sp-1', modelDrivenAppUrl: 'https://dev.crm.dynamics.com/' }),
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
      servicePrincipalId: 'sp-1',
      notes: ' admin org ',
      alert: { enabled: true, level: 2, message: ' Careful ', showCloseButton: false },
    })
    expect(environment).toEqual({
      id: 'id-1',
      name: 'Dev',
      environmentType: 'DOD',
      modelDrivenAppUrl: 'https://dev.crm.dynamics.com/',
      powerPagesUrl: '',
      environmentId: 'env',
      servicePrincipalId: 'sp-1',
      notes: 'admin org',
      alert: { enabled: true, level: 2, message: 'Careful', showCloseButton: false },
    })
    expect(draftFromEnvironment(environment)).toMatchObject({ name: 'Dev', servicePrincipalId: 'sp-1' })
    expect(toEnvironment('id-2', draft({ name: 'Plain' }))).toMatchObject({ servicePrincipalId: null, alert: null })
  })

  it('copies an environment into a new draft without its environment id', () => {
    const environment = toEnvironment('id-1', draft({ name: 'Dev', environmentId: 'abc', servicePrincipalId: 'sp-1' }))
    expect(copyDraft(environment)).toEqual({
      ...draftFromEnvironment(environment),
      name: 'Dev (copy)',
      environmentId: '',
    })
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
    })
  })

  it('seeds a warning banner and sorts environments by name', () => {
    expect(defaultAlert(' Prod ')).toEqual({
      enabled: true,
      level: 3,
      message: 'You are in Prod',
      showCloseButton: true,
    })
    const sorted = sortEnvironments([
      toEnvironment('1', draft({ name: 'Zeta' })),
      toEnvironment('2', draft({ name: 'alpha' })),
    ])
    expect(sorted.map((environment) => environment.id)).toEqual(['2', '1'])
  })
})
