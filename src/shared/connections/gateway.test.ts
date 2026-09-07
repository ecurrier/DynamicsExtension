import { describe, expect, it, vi } from 'vitest'

import { type DataverseHttp } from '@/shared/lib'
import { type Environment } from '@/shared/storage'
import { type SecurityRole, type SystemUser } from '@/shared/types'

import { createGateway, defineGateway } from './gateway'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(async () => 'page-result'),
  getEnvironmentHttp: vi.fn(async () => ({ origin: 'https://env' }) as unknown as DataverseHttp),
}))

vi.mock('@/messaging/client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  invoke: mocks.invoke,
}))

vi.mock('./environmentHttp', () => ({ getEnvironmentHttp: mocks.getEnvironmentHttp }))

const ROLE: SecurityRole = { id: 'r1', name: 'Admin', businessUnitId: null }
const USER: SystemUser = { id: 'u1', fullName: 'Jane', azureAdObjectId: null, domainName: null, isDisabled: false }

const factory = vi.fn((http: DataverseHttp) => ({
  getSecurityRoles: async (): Promise<SecurityRole[]> => [{ ...ROLE, name: http.origin }],
  searchSystemUsers: async ({ query }: { query: string }): Promise<SystemUser[]> => [{ ...USER, fullName: query }],
}))

const definition = defineGateway({
  namespace: 'security',
  operations: ['getSecurityRoles', 'searchSystemUsers'],
  factory,
  timeouts: { searchSystemUsers: 5_000 },
})

const environment: Environment = {
  id: 'env-1',
  name: 'Dev',
  environmentType: 'Commercial',
  modelDrivenAppUrl: 'https://org.crm.dynamics.com/',
  powerPagesUrl: '',
  environmentId: '',
  notes: '',
  servicePrincipalId: null,
  alert: null,
}

describe('createGateway', () => {
  it('forwards page operations through invoke with namespaced commands and timeouts', async () => {
    const gateway = createGateway(definition, { kind: 'page', tabId: 7, ready: true })
    await expect(gateway.ops.searchSystemUsers({ query: 'jane' })).resolves.toBe('page-result')
    expect(mocks.invoke).toHaveBeenCalledWith(7, 'security.searchSystemUsers', { query: 'jane' }, { timeoutMs: 5_000 })
    expect(gateway.key('searchSystemUsers', { query: 'jane' })).toEqual([
      'page',
      7,
      'security.searchSystemUsers',
      { query: 'jane' },
    ])
    expect(gateway.mode).toBe('page')
    expect(gateway.ready).toBe(true)
  })

  it('rejects page operations without a tab', async () => {
    const gateway = createGateway(definition, { kind: 'page', tabId: null, ready: false })
    await expect(gateway.ops.getSecurityRoles()).rejects.toMatchObject({ code: 'NoActiveTab' })
  })

  it('runs environment operations through the factory over environment http', async () => {
    const gateway = createGateway(definition, { kind: 'environment', environment })
    await expect(gateway.ops.getSecurityRoles()).resolves.toEqual([{ ...ROLE, name: 'https://env' }])
    await expect(gateway.ops.searchSystemUsers({ query: 'jo' })).resolves.toEqual([{ ...USER, fullName: 'jo' }])
    expect(mocks.getEnvironmentHttp).toHaveBeenCalledWith(environment)
    expect(gateway.key('getSecurityRoles')).toEqual(['connection', 'env-1', 'security.getSecurityRoles', null])
    expect(gateway.environment).toBe(environment)
  })

  it('reports a missing environment as not ready', async () => {
    const gateway = createGateway(definition, { kind: 'missing' })
    expect(gateway.ready).toBe(false)
    await expect(gateway.ops.getSecurityRoles()).rejects.toThrow('The selected environment no longer exists')
  })
})
