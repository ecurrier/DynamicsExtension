import { describe, expect, it, vi } from 'vitest'

import { DataverseOperationError } from './errors'
import { type DataverseHttp } from './http'
import { securityOperations } from './security'

const USER = '11111111-1111-4111-8111-111111111111'
const UNIT = '22222222-2222-4222-8222-222222222222'
const ROLE_A = '33333333-3333-4333-8333-333333333333'
const ROLE_B = '44444444-4444-4444-8444-444444444444'

const createFakeHttp = (responses: Record<string, unknown> = {}) => {
  const calls: { method: string; path: string; body?: unknown }[] = []
  const respond = (method: string, path: string, body?: unknown) => {
    calls.push({ method, path, body })
    const match = Object.entries(responses).find(([needle]) => decodeURIComponent(path).includes(needle))
    return Promise.resolve(match?.[1])
  }
  const http = {
    origin: 'https://org.crm.dynamics.com',
    apiUrl: 'https://org.crm.dynamics.com/api/data/v9.2/',
    request: (method: string, path: string, body?: unknown) => respond(method, path, body),
    get: (path: string) => respond('GET', path),
    post: (path: string, body: unknown) => respond('POST', path, body),
    patch: (path: string, body: unknown) => respond('PATCH', path, body),
    delete: (path: string) => respond('DELETE', path),
  } as unknown as DataverseHttp
  return { http, calls }
}

describe('securityOperations', () => {
  it('reads roles and business units through fetchXml on the entity sets', async () => {
    const { http, calls } = createFakeHttp({
      'roles?fetchXml': {
        value: [{ roleid: `{${ROLE_A.toUpperCase()}}`, name: 'Admin', _businessunitid_value: UNIT }],
      },
      'businessunits?fetchXml': { value: [{ businessunitid: UNIT, name: 'Contoso' }] },
    })
    const operations = securityOperations(http)
    await expect(operations.getSecurityRoles()).resolves.toEqual([{ id: ROLE_A, name: 'Admin', businessUnitId: UNIT }])
    await expect(operations.getBusinessUnits()).resolves.toEqual([{ id: UNIT, name: 'Contoso' }])
    expect(calls.map((call) => call.path.split('?')[0])).toEqual(['roles', 'businessunits'])
    expect(decodeURIComponent(calls[0]?.path ?? '')).toContain('<entity name="role">')
  })

  it('escapes and requires a search term', async () => {
    const { http, calls } = createFakeHttp({
      systemusers: {
        value: [
          {
            systemuserid: USER,
            fullname: 'Jane',
            azureactivedirectoryobjectid: `{${ROLE_B.toUpperCase()}}`,
            domainname: 'jane@contoso.com',
            isdisabled: false,
          },
          { systemuserid: UNIT, fullname: 'App User', isdisabled: true },
        ],
      },
    })
    const operations = securityOperations(http)
    await expect(operations.searchSystemUsers('  ')).rejects.toBeInstanceOf(DataverseOperationError)
    await expect(operations.searchSystemUsers('ja%ne')).resolves.toEqual([
      { id: USER, fullName: 'Jane', azureAdObjectId: ROLE_B, domainName: 'jane@contoso.com', isDisabled: false },
      { id: UNIT, fullName: 'App User', azureAdObjectId: null, domainName: null, isDisabled: true },
    ])
    expect(decodeURIComponent(calls[0]?.path ?? '')).toContain('value="%jane%"')
  })

  it('checks business unit membership before loading user roles', async () => {
    const { http } = createFakeHttp({ systemusers: { value: [] } })
    await expect(securityOperations(http).getUserSecurityRoles(USER, UNIT)).rejects.toMatchObject({ code: 'NotFound' })
    await expect(securityOperations(http).getUserSecurityRoles('nope', UNIT)).rejects.toMatchObject({
      code: 'InvalidArgument',
    })
  })

  it('loads every role a user holds without a business unit filter', async () => {
    const { http, calls } = createFakeHttp({
      'roles?fetchXml': { value: [{ roleid: ROLE_A, name: 'Admin', _businessunitid_value: UNIT }] },
    })
    await expect(securityOperations(http).getSystemUserRoles(USER)).resolves.toEqual([
      { id: ROLE_A, name: 'Admin', businessUnitId: UNIT },
    ])
    const fetchXml = decodeURIComponent(calls[0]?.path ?? '')
    expect(fetchXml).toContain(`<condition attribute="systemuserid" operator="eq" value="${USER}" />`)
    expect(fetchXml).not.toContain('attribute="businessunitid" operator')
    await expect(securityOperations(http).getSystemUserRoles('nope')).rejects.toMatchObject({
      code: 'InvalidArgument',
    })
  })

  it('associates and disassociates through $ref requests', async () => {
    const { http, calls } = createFakeHttp()
    await securityOperations(http).applySecurityRoleChanges({
      systemUserId: USER,
      associateRoleIds: [ROLE_A],
      disassociateRoleIds: [ROLE_B],
    })
    expect(calls).toEqual([
      {
        method: 'POST',
        path: `systemusers(${USER})/systemuserroles_association/$ref`,
        body: { '@odata.id': `https://org.crm.dynamics.com/api/data/v9.2/roles(${ROLE_A})` },
      },
      { method: 'DELETE', path: `systemusers(${USER})/systemuserroles_association(${ROLE_B})/$ref`, body: undefined },
    ])
    expect(vi.isMockFunction(http.get)).toBe(false)
  })
})
