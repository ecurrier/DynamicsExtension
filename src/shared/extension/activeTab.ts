import { browser } from 'wxt/browser'

export interface ActiveTab {
  id: number
  url: string | null
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
