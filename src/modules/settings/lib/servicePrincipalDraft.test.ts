import { describe, expect, it } from 'vitest'

import { type Environment } from '@/shared/storage'

import {
  draftFromServicePrincipal,
  EMPTY_PRINCIPAL_DRAFT,
  environmentsUsingPrincipal,
  sortServicePrincipals,
  toServicePrincipal,
  validatePrincipalDraft,
} from './servicePrincipalDraft'

const environment = (id: string, servicePrincipalId: string | null): Environment => ({
  id,
  name: id,
  environmentType: 'Commercial',
  modelDrivenAppUrl: '',
  powerPagesUrl: '',
  environmentId: '',
  notes: '',
  servicePrincipalId,
  alert: null,
})

describe('servicePrincipalDraft', () => {
  it('validates every required field in order', () => {
    expect(validatePrincipalDraft(EMPTY_PRINCIPAL_DRAFT)?.field).toBe('name')
    expect(validatePrincipalDraft({ ...EMPTY_PRINCIPAL_DRAFT, name: 'Dev' })?.field).toBe('tenantId')
    expect(validatePrincipalDraft({ ...EMPTY_PRINCIPAL_DRAFT, name: 'Dev', tenantId: 't' })?.field).toBe('clientId')
    expect(validatePrincipalDraft({ ...EMPTY_PRINCIPAL_DRAFT, name: 'Dev', tenantId: 't', clientId: 'c' })?.field).toBe(
      'clientSecret',
    )
    expect(
      validatePrincipalDraft({
        ...EMPTY_PRINCIPAL_DRAFT,
        name: 'Dev',
        tenantId: 't',
        clientId: 'c',
        clientSecret: 's',
      }),
    ).toBeNull()
  })

  it('round-trips and trims values', () => {
    const principal = toServicePrincipal('sp-1', {
      name: ' Dev ',
      tenantId: ' t ',
      clientId: ' c ',
      clientSecret: ' s ',
      notes: ' n ',
    })
    expect(principal).toEqual({ id: 'sp-1', name: 'Dev', tenantId: 't', clientId: 'c', clientSecret: 's', notes: 'n' })
    expect(draftFromServicePrincipal(principal)).toEqual({
      name: 'Dev',
      tenantId: 't',
      clientId: 'c',
      clientSecret: 's',
      notes: 'n',
    })
  })

  it('sorts by name and finds environments using a principal', () => {
    const sorted = sortServicePrincipals([
      toServicePrincipal('2', { ...EMPTY_PRINCIPAL_DRAFT, name: 'Zeta' }),
      toServicePrincipal('1', { ...EMPTY_PRINCIPAL_DRAFT, name: 'alpha' }),
    ])
    expect(sorted.map((principal) => principal.id)).toEqual(['1', '2'])
    const environments = [environment('dev', 'sp-1'), environment('uat', 'sp-1'), environment('prod', null)]
    expect(environmentsUsingPrincipal('sp-1', environments).map((candidate) => candidate.id)).toEqual(['dev', 'uat'])
    expect(environmentsUsingPrincipal('sp-9', environments)).toEqual([])
  })
})
