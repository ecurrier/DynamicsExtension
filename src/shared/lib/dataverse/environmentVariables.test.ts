import { describe, expect, it } from 'vitest'

import { createFakeHttp } from '@/test/fakeHttp'

import { environmentVariableOperations } from './environmentVariables'

const DEFINITION = '11111111-1111-4111-8111-111111111111'
const VALUE = '22222222-2222-4222-8222-222222222222'

describe('environmentVariableOperations', () => {
  it('maps definitions with their first value row and skips unknown types', async () => {
    const { http, calls } = createFakeHttp({
      'environmentvariabledefinitions?': {
        value: [
          {
            environmentvariabledefinitionid: `{${DEFINITION.toUpperCase()}}`,
            schemaname: 'contoso_Url',
            displayname: 'URL',
            type: 100000000,
            defaultvalue: 'https://x',
            ismanaged: true,
            environmentvariabledefinition_environmentvariablevalue: [
              { environmentvariablevalueid: VALUE, value: 'https://y' },
              { environmentvariablevalueid: DEFINITION, value: 'ignored' },
            ],
          },
          { environmentvariabledefinitionid: VALUE, schemaname: 'contoso_Odd', type: 5 },
          { environmentvariabledefinitionid: VALUE, schemaname: 'contoso_NoName', type: 100000002 },
        ],
      },
    })
    const variables = await environmentVariableOperations(http).getDefinitions()
    expect(variables).toEqual([
      {
        id: DEFINITION,
        schemaName: 'contoso_Url',
        displayName: 'URL',
        description: null,
        type: 100000000,
        defaultValue: 'https://x',
        currentValue: 'https://y',
        valueId: VALUE,
        isManaged: true,
        hint: null,
        valueSchema: null,
      },
      expect.objectContaining({ schemaName: 'contoso_NoName', displayName: 'contoso_NoName', currentValue: null }),
    ])
    const path = decodeURIComponent(calls[0]?.path ?? '')
    expect(path).toContain('$expand=environmentvariabledefinition_environmentvariablevalue')
    expect(path).toContain('$filter=statecode eq 0')
  })

  it('creates a value bound to its definition and returns the new id', async () => {
    const { http, calls } = createFakeHttp({
      'POST environmentvariablevalues': { environmentvariablevalueid: VALUE.toUpperCase() },
    })
    await expect(
      environmentVariableOperations(http).setValue({ definitionId: DEFINITION, valueId: null, value: 'abc' }),
    ).resolves.toEqual({ valueId: VALUE })
    expect(calls).toEqual([
      {
        method: 'POST',
        path: 'environmentvariablevalues',
        body: {
          value: 'abc',
          'EnvironmentVariableDefinitionId@odata.bind': `/environmentvariabledefinitions(${DEFINITION})`,
        },
        headers: { Prefer: 'return=representation' },
      },
    ])
  })

  it('patches an existing value row', async () => {
    const { http, calls } = createFakeHttp()
    await expect(
      environmentVariableOperations(http).setValue({ definitionId: DEFINITION, valueId: VALUE, value: 'abc' }),
    ).resolves.toEqual({ valueId: VALUE })
    expect(calls).toEqual([{ method: 'PATCH', path: `environmentvariablevalues(${VALUE})`, body: { value: 'abc' } }])
  })

  it('fails clearly when the create response carries no id', async () => {
    const { http } = createFakeHttp()
    await expect(
      environmentVariableOperations(http).setValue({ definitionId: DEFINITION, valueId: null, value: 'abc' }),
    ).rejects.toMatchObject({ code: 'NotFound' })
  })

  it('deletes value rows and validates ids', async () => {
    const { http, calls } = createFakeHttp()
    await environmentVariableOperations(http).clearValue({ valueId: VALUE })
    expect(calls).toEqual([{ method: 'DELETE', path: `environmentvariablevalues(${VALUE})` }])
    await expect(environmentVariableOperations(http).clearValue({ valueId: 'nope' })).rejects.toMatchObject({
      code: 'InvalidArgument',
    })
  })
})
