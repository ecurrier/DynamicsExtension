import { useMemo } from 'react'

import { connectableEnvironments } from '@/shared/connections'

import { useEnvironments } from './useEnvironments'
import { useServicePrincipals } from './useServicePrincipals'

export const useConnectableEnvironments = () => {
  const { environments, byId, isLoading } = useEnvironments()
  const principals = useServicePrincipals()
  const connectable = useMemo(
    () => connectableEnvironments(environments, principals.byId),
    [environments, principals.byId],
  )
  return { environments: connectable, byId, isLoading: isLoading || principals.isLoading }
}
