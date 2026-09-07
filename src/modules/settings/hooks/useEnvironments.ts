import { useMemo } from 'react'

import { type Environment, environmentsItem, useStorageItem, useStorageUpdate } from '@/shared/storage'

import { sortEnvironments } from '../lib'

export const useEnvironments = () => {
  const query = useStorageItem(environmentsItem)
  const update = useStorageUpdate(environmentsItem)
  const environments = useMemo(() => sortEnvironments(Object.values(query.data ?? {})), [query.data])
  const upsert = (environment: Environment) =>
    update.mutateAsync((current) => ({ ...current, [environment.id]: environment }))
  const remove = (id: string) =>
    update.mutateAsync((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  return {
    environments,
    byId: query.data ?? {},
    isLoading: query.isLoading,
    upsert,
    remove,
    isSaving: update.isPending,
  }
}
