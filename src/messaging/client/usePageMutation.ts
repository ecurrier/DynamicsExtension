import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query'

import { type CommandArgs, type CommandName, type CommandResult } from '@/messaging/contract'
import { invoke, PageCommandError } from '@/messaging/tab'
import { useSessionStore } from '@/shared/stores'

export interface PageMutationOptions<N extends CommandName> {
  timeoutMs?: number
  silent?: boolean
  invalidates?: (args: CommandArgs<N>, result: CommandResult<N>) => QueryKey[]
  onSuccess?: (result: CommandResult<N>, args: CommandArgs<N>) => void | Promise<void>
  onError?: (error: PageCommandError, args: CommandArgs<N>) => void
}

export const usePageMutation = <N extends CommandName>(name: N, options: PageMutationOptions<N> = {}) => {
  const tabId = useSessionStore((state) => state.tabId)
  const queryClient = useQueryClient()
  return useMutation<CommandResult<N>, PageCommandError, CommandArgs<N>>({
    meta: { silent: options.silent ?? false },
    mutationFn: (args) => {
      if (tabId === null) {
        throw new PageCommandError(name, 'NoActiveTab', 'No active browser tab was found')
      }
      return invoke(tabId, name, args, { timeoutMs: options.timeoutMs })
    },
    onSuccess: async (result, args) => {
      for (const queryKey of options.invalidates?.(args, result) ?? []) {
        await queryClient.invalidateQueries({ queryKey })
      }
      await options.onSuccess?.(result, args)
    },
    onError: (error, args) => options.onError?.(error, args),
  })
}
