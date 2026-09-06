import { useMemo } from 'react'

import { environmentsItem, useStorageItem } from '@/shared/storage'
import { useSessionStore } from '@/shared/stores'

import { createGateway, type Gateway, type GatewayDefinition, type GatewayOperations } from './gateway'
import { type ConnectionTarget } from './types'

export const useGateway = <NS extends string, K extends string, Ops extends GatewayOperations<NS, K>>(
  definition: GatewayDefinition<NS, K, Ops>,
  connection: ConnectionTarget,
): Gateway<Ops, K> => {
  const tabId = useSessionStore((state) => state.tabId)
  const bridgeStatus = useSessionStore((state) => state.bridgeStatus)
  const environments = useStorageItem(environmentsItem)
  const environment = connection.kind === 'environment' ? (environments.data?.[connection.environmentId] ?? null) : null
  return useMemo(() => {
    if (connection.kind === 'page') {
      return createGateway(definition, { kind: 'page', tabId, ready: tabId !== null && bridgeStatus === 'ready' })
    }
    return createGateway(definition, environment ? { kind: 'environment', environment } : { kind: 'missing' })
  }, [definition, connection.kind, environment, tabId, bridgeStatus])
}
