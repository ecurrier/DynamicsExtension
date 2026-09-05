import { browser } from 'wxt/browser'

import { buildImpersonationRule, impersonationHeaderFor, impersonationRuleId } from '@/shared/lib'
import { impersonationItem } from '@/shared/storage'
import { type ImpersonationState, type ImpersonationStates, type StartImpersonationRequest } from '@/shared/types'

const updateStates = async (mutate: (states: ImpersonationStates) => void): Promise<void> => {
  const next = { ...(await impersonationItem.getValue()) }
  mutate(next)
  await impersonationItem.setValue(next)
}

const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export const startImpersonation = async ({
  tabId,
  orgOrigin,
  user,
}: StartImpersonationRequest): Promise<ImpersonationState> => {
  const headerValue = impersonationHeaderFor(user)
  const rule = buildImpersonationRule(tabId, orgOrigin, headerValue)
  await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [rule.id], addRules: [rule as never] })
  const state: ImpersonationState = {
    tabId,
    orgOrigin,
    user,
    header: headerValue.header,
    startedAt: new Date().toISOString(),
  }
  await updateStates((states) => {
    states[String(tabId)] = state
  })
  return state
}

export const stopImpersonation = async (tabId: number): Promise<void> => {
  await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [impersonationRuleId(tabId)] })
  await updateStates((states) => {
    delete states[String(tabId)]
  })
}

export const getImpersonation = async (tabId: number): Promise<ImpersonationState | null> =>
  (await impersonationItem.getValue())[String(tabId)] ?? null

export const reconcileImpersonation = async (): Promise<void> => {
  const rules = await browser.declarativeNetRequest.getSessionRules()
  const ruleIds = new Set(rules.map((rule) => rule.id))
  await updateStates((states) => {
    for (const key of Object.keys(states)) {
      if (!ruleIds.has(Number(key))) {
        delete states[key]
      }
    }
  })
}

export const watchImpersonatedTabs = (): void => {
  browser.tabs.onRemoved.addListener((tabId) => {
    void stopImpersonation(tabId)
  })
  browser.tabs.onUpdated.addListener((tabId, change) => {
    const url = change.url
    if (!url) {
      return
    }
    void getImpersonation(tabId).then((state) => {
      if (state && originOf(url) !== state.orgOrigin) {
        return stopImpersonation(tabId)
      }
      return undefined
    })
  })
}
