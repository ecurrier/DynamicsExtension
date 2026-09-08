import { useQuery } from '@tanstack/react-query'

import { type CommandArgs, type CommandResult, type QueryCommandName } from '@/messaging/contract'
import { invoke, PageCommandError } from '@/messaging/tab'
import { useSessionStore } from '@/shared/stores'

import { pageKeys } from './queryKeys'

const FIVE_MINUTES = 5 * 60 * 1000

const STALE_TIMES: Record<QueryCommandName, number> = {
  'global.getPageContext': FIVE_MINUTES,
  'global.getSolutions': Infinity,
  'settings.getEnvironmentDetails': FIVE_MINUTES,
  'utilities.generateFetchXml': 0,
  'utilities.generateUrls': 0,
  'utilities.getWebApiUrl': 0,
  'utilities.getSessionSnapshot': 0,
  'utilities.getPageTarget': 0,
  'utilities.getControlDetails': 0,
  'utilities.getFormAttributes': 0,
  'utilities.getRecordPayloadSource': 0,
  'formPresets.captureFormValues': 0,
  'webapi.getAttributeMetadata': Infinity,
  'webapi.getRecordValues': 0,
  'webapi.getEntityInfo': Infinity,
  'webapi.searchRecords': 0,
  'webapi.executeFetchXml': 0,
  'forms.getForms': Infinity,
  'forms.getFormXml': 0,
  'forms.getFormDiagnostics': 0,
  'traces.query': 0,
  'traces.getSetting': FIVE_MINUTES,
  'security.getCurrentUser': FIVE_MINUTES,
  'security.getSecurityRoles': Infinity,
  'security.getBusinessUnits': Infinity,
  'security.searchSystemUsers': 0,
  'security.getUserSecurityRoles': 0,
  'security.getSystemUserRoles': 0,
  'environmentVariables.getDefinitions': 0,
  'pluginSteps.getSteps': 0,
  'pluginSteps.get': FIVE_MINUTES,
  'transport.listEntities': 0,
  'transport.listViews': 0,
  'transport.getEntityMetadata': 0,
  'transport.retrievePage': 0,
  'investigate.getTableAutomation': 0,
  'investigate.getRecordAccess': 0,
  'investigate.getRecordHistory': 0,
  'investigate.getAuditDetail': 0,
  'investigate.getSolutionLayers': 0,
  'investigate.getColumnUsage': 0,
  'investigate.getTableMetadata': 0,
  'investigate.getRecordCounts': 0,
  'investigate.listTables': 0,
  'investigate.getTableColumns': 0,
  'codegen.getTableModel': Infinity,
  'codegen.getGlobalChoices': Infinity,
}

export interface PageQueryOptions {
  enabled?: boolean
  staleTime?: number
  refetchInterval?: number | false
}

export const usePageQuery = <N extends QueryCommandName>(
  name: N,
  args: CommandArgs<N>,
  options: PageQueryOptions = {},
) => {
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
    staleTime: options.staleTime ?? STALE_TIMES[name],
    refetchInterval: options.refetchInterval ?? false,
    retry: false,
  })
}
