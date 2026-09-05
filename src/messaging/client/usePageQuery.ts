import { useQuery } from '@tanstack/react-query'

import { type CommandArgs, type CommandName, type CommandResult } from '@/messaging/contract'
import { useSessionStore } from '@/shared/stores'

import { invoke } from './invoke'
import { PageCommandError } from './PageCommandError'
import { pageKeys } from './queryKeys'

const FIVE_MINUTES = 5 * 60 * 1000

const STALE_TIMES: Partial<Record<CommandName, number>> = {
  'global.getPageContext': FIVE_MINUTES,
  'global.getSolutions': Infinity,
  'settings.getEnvironmentDetails': FIVE_MINUTES,
  'security.getCurrentUser': FIVE_MINUTES,
  'security.getSecurityRoles': Infinity,
  'security.getBusinessUnits': Infinity,
  'webapi.getAttributeMetadata': Infinity,
  'webapi.getEntityInfo': Infinity,
  'forms.getForms': Infinity,
  'traces.getSetting': FIVE_MINUTES,
  'utilities.getChoiceMetadata': Infinity,
}

export interface PageQueryOptions {
  enabled?: boolean
  staleTime?: number
  refetchInterval?: number | false
}

export const usePageQuery = <N extends CommandName>(name: N, args: CommandArgs<N>, options: PageQueryOptions = {}) => {
  const tabId = useSessionStore((state) => state.tabId)
  const bridgeStatus = useSessionStore((state) => state.bridgeStatus)
  const enabled = tabId !== null && bridgeStatus === 'ready' && (options.enabled ?? true)
  return useQuery<CommandResult<N>, PageCommandError>({
    queryKey: pageKeys.command(tabId ?? -1, name, args ?? null),
    queryFn: () => {
      if (tabId === null) {
        throw new PageCommandError(name, 'NoActiveTab', 'No active browser tab was found')
      }
      return invoke(tabId, name, args)
    },
    enabled,
    staleTime: options.staleTime ?? STALE_TIMES[name] ?? 0,
    refetchInterval: options.refetchInterval ?? false,
    retry: false,
  })
}
