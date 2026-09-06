import { useMemo } from 'react'

import { clearCachedTokensFor } from '@/shared/connections'
import { type ServicePrincipal, servicePrincipalsItem, useStorageItem, useStorageUpdate } from '@/shared/storage'

import { sortServicePrincipals } from '../lib'

export const useServicePrincipals = () => {
  const query = useStorageItem(servicePrincipalsItem)
  const update = useStorageUpdate(servicePrincipalsItem)
  const principals = useMemo(() => sortServicePrincipals(Object.values(query.data ?? {})), [query.data])
  const upsert = async (principal: ServicePrincipal) => {
    const next = await update.mutateAsync((current) => ({ ...current, [principal.id]: principal }))
    await clearCachedTokensFor(`${principal.id}:`)
    return next
  }
  const remove = async (id: string) => {
    const next = await update.mutateAsync((current) => {
      const remaining = { ...current }
      delete remaining[id]
      return remaining
    })
    await clearCachedTokensFor(`${id}:`)
    return next
  }
  return {
    principals,
    byId: query.data ?? {},
    isLoading: query.isLoading,
    upsert,
    remove,
    isSaving: update.isPending,
  }
}
