import { usePageQuery } from '@/messaging/client'

export const useTableModel = (entityLogicalName: string | null) =>
  usePageQuery(
    'codegen.getTableModel',
    { entityLogicalName: entityLogicalName ?? '' },
    { enabled: entityLogicalName !== null },
  )

export const useGlobalChoices = (enabled = true) => usePageQuery('codegen.getGlobalChoices', undefined, { enabled })
