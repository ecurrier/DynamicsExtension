import { type QueryKey } from '@tanstack/react-query'

import { invoke, PageCommandError, pageKeys } from '@/messaging/client'
import { type CommandArgs, type CommandName, type CommandResult } from '@/messaging/contract'
import { type DataverseHttp } from '@/shared/lib'
import { type Environment } from '@/shared/storage'

import { connectionKeys } from './connectionKeys'
import { getEnvironmentHttp } from './environmentHttp'

type CommandFor<NS extends string, K extends string> = `${NS}.${K}` & CommandName

export type GatewayOperations<NS extends string, K extends string> = {
  [P in K]: (args: CommandArgs<CommandFor<NS, P>>) => Promise<CommandResult<CommandFor<NS, P>>>
}

export interface GatewayDefinition<NS extends string, K extends string, Ops extends GatewayOperations<NS, K>> {
  namespace: NS
  operations: readonly K[]
  factory: (http: DataverseHttp) => Ops
  timeouts?: Partial<Record<K, number>>
}

export type GatewaySource =
  | { kind: 'page'; tabId: number | null; ready: boolean }
  | { kind: 'environment'; environment: Environment }
  | { kind: 'missing' }

export interface Gateway<Ops, K extends string> {
  mode: 'page' | 'environment'
  ready: boolean
  environment: Environment | null
  key: (name: K, args?: unknown) => QueryKey
  ops: Pick<Ops, K & keyof Ops>
}

type AnyOperation = (args: unknown) => Promise<unknown>

export const defineGateway = <NS extends string, K extends string, Ops extends GatewayOperations<NS, K>>(
  definition: GatewayDefinition<NS, K, Ops>,
): GatewayDefinition<NS, K, Ops> => definition

const buildOps = <Ops, K extends string>(
  names: readonly K[],
  build: (name: K) => AnyOperation,
): Pick<Ops, K & keyof Ops> => Object.fromEntries(names.map((name) => [name, build(name)])) as Pick<Ops, K & keyof Ops>

export const createGateway = <NS extends string, K extends string, Ops extends GatewayOperations<NS, K>>(
  definition: GatewayDefinition<NS, K, Ops>,
  source: GatewaySource,
): Gateway<Ops, K> => {
  const { namespace, operations, factory, timeouts } = definition
  const commandFor = (name: K): CommandName => `${namespace}.${name}` as CommandName
  if (source.kind === 'page') {
    const { tabId, ready } = source
    const requireTab = (command: CommandName): number => {
      if (tabId === null) {
        throw new PageCommandError(command, 'NoActiveTab', 'No active browser tab was found')
      }
      return tabId
    }
    return {
      mode: 'page',
      ready,
      environment: null,
      key: (name, args) => [...pageKeys.tab(tabId ?? -1), commandFor(name), args ?? null],
      ops: buildOps<Ops, K>(operations, (name) => {
        const command = commandFor(name)
        return async (args) => invoke(requireTab(command), command, args as never, { timeoutMs: timeouts?.[name] })
      }),
    }
  }
  if (source.kind === 'missing') {
    return {
      mode: 'environment',
      ready: false,
      environment: null,
      key: (name, args) => connectionKeys.operation('missing', commandFor(name), args),
      ops: buildOps<Ops, K>(
        operations,
        () => () => Promise.reject(new Error('The selected environment no longer exists')),
      ),
    }
  }
  const { environment } = source
  const resolve = () => getEnvironmentHttp(environment).then(factory)
  return {
    mode: 'environment',
    ready: true,
    environment,
    key: (name, args) => connectionKeys.operation(environment.id, commandFor(name), args),
    ops: buildOps<Ops, K>(
      operations,
      (name) => (args) => resolve().then((ops) => (ops[name] as unknown as AnyOperation)(args)),
    ),
  }
}
