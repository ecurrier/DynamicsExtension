import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { storageKeys } from '@/messaging/client'

import { type StorageItem } from './items'

export const useStorageItem = <T>(item: StorageItem<T>) => {
  const queryClient = useQueryClient()
  useEffect(
    () =>
      item.watch(() => {
        void queryClient.invalidateQueries({ queryKey: storageKeys.item(item.key) })
      }),
    [item, queryClient],
  )
  return useQuery<T>({
    queryKey: storageKeys.item(item.key),
    queryFn: () => item.getValue(),
    staleTime: Infinity,
  })
}

export const useStorageMutation = <T>(item: StorageItem<T>) => {
  const queryClient = useQueryClient()
  return useMutation<void, Error, T>({
    mutationFn: (value) => item.setValue(value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storageKeys.item(item.key) }),
  })
}

export const useStorageUpdate = <T>(item: StorageItem<T>) => {
  const queryClient = useQueryClient()
  return useMutation<T, Error, (current: T) => T>({
    mutationFn: async (update) => {
      const next = update(await item.getValue())
      await item.setValue(next)
      return next
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storageKeys.item(item.key) }),
  })
}
