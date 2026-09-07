import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { type CommandArgs, type CommandName, type CommandResult } from '@/messaging/contract'
import { invoke, PageCommandError } from '@/messaging/tab'
import { useSessionStore } from '@/shared/stores'

import { pageKeys } from './queryKeys'

export interface PageFetchOptions {
  fresh?: boolean
}

export const usePageFetcher = () => {
  const tabId = useSessionStore((state) => state.tabId)
  const queryClient = useQueryClient()
  return useCallback(
    <N extends CommandName>(
      name: N,
      args: CommandArgs<N>,
      options: PageFetchOptions = {},
    ): Promise<CommandResult<N>> => {
      if (tabId === null) {
        return Promise.reject(new PageCommandError(name, 'NoActiveTab', 'No active browser tab was found'))
      }
      const queryKey = pageKeys.command(tabId, name, args ?? null)
      const queryFn = () => invoke(tabId, name, args)
      return options.fresh
        ? queryClient.fetchQuery({ queryKey, queryFn, staleTime: 0 })
        : queryClient.ensureQueryData({ queryKey, queryFn })
    },
    [queryClient, tabId],
  )
}
