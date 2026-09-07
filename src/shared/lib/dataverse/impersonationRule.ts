import { type ImpersonatedUser, type ImpersonationHeader } from '@/shared/types'

export interface ImpersonationRule {
  id: number
  priority: number
  action: {
    type: 'modifyHeaders'
    requestHeaders: { header: string; operation: 'set'; value: string }[]
  }
  condition: {
    tabIds: number[]
    urlFilter: string
    resourceTypes: ('xmlhttprequest' | 'main_frame' | 'sub_frame')[]
  }
}

export interface ImpersonationHeaderValue {
  header: ImpersonationHeader
  value: string
}

export const impersonationHeaderFor = (user: ImpersonatedUser): ImpersonationHeaderValue =>
  user.azureAdObjectId
    ? { header: 'CallerObjectId', value: user.azureAdObjectId }
    : { header: 'MSCRMCallerID', value: user.id }

export const impersonationRuleId = (tabId: number): number => tabId

export const buildImpersonationRule = (
  tabId: number,
  orgOrigin: string,
  headerValue: ImpersonationHeaderValue,
): ImpersonationRule => ({
  id: impersonationRuleId(tabId),
  priority: 1,
  action: {
    type: 'modifyHeaders',
    requestHeaders: [{ header: headerValue.header, operation: 'set', value: headerValue.value }],
  },
  condition: {
    tabIds: [tabId],
    urlFilter: `${orgOrigin}/api/data/v*`,
    resourceTypes: ['xmlhttprequest', 'main_frame', 'sub_frame'],
  },
})
