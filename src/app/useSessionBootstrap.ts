import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { browser } from 'wxt/browser'

import { ensurePageBridge, invoke, pageKeys } from '@/messaging/client'
import { DEFAULT_AREA, resolveArea } from '@/modules'
import { getActiveTab, getTabById, type PopupLaunch, readPopupLaunch } from '@/shared/extension'
import { lastVisitedAreaItem, settingsItem } from '@/shared/storage'
import { useNavigationStore, useSessionStore } from '@/shared/stores'

const resolveInitialArea = async (): Promise<string> => {
  try {
    const settings = await settingsItem.getValue()
    if (!settings.openLastVisitedArea) {
      return DEFAULT_AREA
    }
    return resolveArea(await lastVisitedAreaItem.getValue()).id
  } catch {
    return DEFAULT_AREA
  }
}

const connectToTab = async (
  launch: PopupLaunch,
): Promise<{
  tabId: number
  tabUrl: string | null
  pageContext: string | null
} | null> => {
  const tab = launch.mode === 'window' && launch.tabId !== null ? await getTabById(launch.tabId) : await getActiveTab()
  if (!tab) {
    return null
  }
  await ensurePageBridge(tab.id)
  const pageContext = await invoke(tab.id, 'global.getPageContext', undefined)
  return { tabId: tab.id, tabUrl: tab.url, pageContext }
}

const watchPinnedTab = (tabId: number, onRemoved: () => void, onLoaded: () => void): (() => void) => {
  const removed = (removedTabId: number) => {
    if (removedTabId === tabId) {
      onRemoved()
    }
  }
  const updated = (updatedTabId: number, change: { status?: string }) => {
    if (updatedTabId === tabId && change.status === 'complete') {
      onLoaded()
    }
  }
  browser.tabs.onRemoved.addListener(removed)
  browser.tabs.onUpdated.addListener(updated)
  return () => {
    browser.tabs.onRemoved.removeListener(removed)
    browser.tabs.onUpdated.removeListener(updated)
  }
}

export const useSessionBootstrap = () => {
  const queryClient = useQueryClient()
  const setTab = useSessionStore((state) => state.setTab)
  const setBridgeStatus = useSessionStore((state) => state.setBridgeStatus)
  const currentAreaId = useNavigationStore((state) => state.currentAreaId)

  useEffect(() => {
    const launch = readPopupLaunch()
    let cancelled = false
    const run = async () => {
      const initialArea = await resolveInitialArea()
      if (!cancelled && !useNavigationStore.getState().currentAreaId) {
        useNavigationStore.setState({ currentAreaId: initialArea })
      }
      try {
        const session = await connectToTab(launch)
        if (cancelled) {
          return
        }
        if (!session) {
          setBridgeStatus('unavailable')
          return
        }
        setTab(session.tabId, session.tabUrl)
        queryClient.setQueryData(pageKeys.command(session.tabId, 'global.getPageContext', null), session.pageContext)
        setBridgeStatus('ready')
      } catch {
        if (!cancelled) {
          setBridgeStatus('unavailable')
        }
      }
    }
    void run()
    const pinnedTabId = launch.mode === 'window' ? launch.tabId : null
    const unwatch =
      pinnedTabId === null
        ? undefined
        : watchPinnedTab(
            pinnedTabId,
            () => setBridgeStatus('unavailable'),
            () => {
              void getTabById(pinnedTabId).then((tab) => {
                if (tab) {
                  setTab(tab.id, tab.url)
                }
                return queryClient.invalidateQueries({ queryKey: pageKeys.tab(pinnedTabId) })
              })
            },
          )
    return () => {
      cancelled = true
      unwatch?.()
    }
  }, [queryClient, setBridgeStatus, setTab])

  return currentAreaId !== ''
}
