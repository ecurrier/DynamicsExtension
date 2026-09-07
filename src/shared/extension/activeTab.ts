import { browser } from 'wxt/browser'

export interface ActiveTab {
  id: number
  url: string | null
}

export interface TabSummary {
  id: number
  url: string | null
  title: string | null
}

export const getActiveTab = async (): Promise<ActiveTab | null> => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    return null
  }
  return { id: tab.id, url: tab.url ?? null }
}

export const getTabById = async (tabId: number): Promise<ActiveTab | null> => {
  try {
    const tab = await browser.tabs.get(tabId)
    return tab.id ? { id: tab.id, url: tab.url ?? null } : null
  } catch {
    return null
  }
}

export const describeTab = async (tabId: number): Promise<TabSummary | null> => {
  try {
    const tab = await browser.tabs.get(tabId)
    return tab.id ? { id: tab.id, url: tab.url ?? null, title: tab.title ?? null } : null
  } catch {
    return null
  }
}

export const focusTab = async (tabId: number): Promise<boolean> => {
  try {
    const tab = await browser.tabs.get(tabId)
    if (tab.windowId !== undefined) {
      await browser.windows.update(tab.windowId, { focused: true })
    }
    await browser.tabs.update(tabId, { active: true })
    return true
  } catch {
    return false
  }
}
