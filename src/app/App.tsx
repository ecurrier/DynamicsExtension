import { Spinner } from '@fluentui/react-components'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { pageKeys, usePageQuery } from '@/messaging/client'
import { modules, resolveArea } from '@/modules'
import { ImpersonationIndicator } from '@/modules/impersonation'
import { AppNavDrawer, AppShell, HostAccessBanner } from '@/shared/components'
import { describeTab, focusTab, openPinnedWindow, readPopupLaunch, type TabSummary } from '@/shared/extension'
import { useAsyncAction } from '@/shared/hooks'
import { resolveOrgOrigin, tabTooltip } from '@/shared/lib'
import { useNavigationStore, useSessionStore } from '@/shared/stores'

import { AreaOutlet } from './AreaOutlet'
import { useSessionBootstrap } from './useSessionBootstrap'

const WINDOW_ACCESS_REASON =
  'This window stays open while you work, but after the page reloads it can only reconnect to the tab with access to the site.'

export const App = () => {
  const ready = useSessionBootstrap()
  const queryClient = useQueryClient()
  const launch = useMemo(() => readPopupLaunch(), [])
  const tabId = useSessionStore((state) => state.tabId)
  const tabUrl = useSessionStore((state) => state.tabUrl)
  const currentAreaId = useNavigationStore((state) => state.currentAreaId)
  const drawerOpen = useNavigationStore((state) => state.drawerOpen)
  const navigate = useNavigationStore((state) => state.navigate)
  const setDrawerOpen = useNavigationStore((state) => state.setDrawerOpen)
  const environment = usePageQuery('settings.getEnvironmentDetails', undefined)
  const pin = useAsyncAction('Could not open Power Tools in a window')
  const goToTab = useAsyncAction('Could not switch to the tab this window follows')
  const environmentName = environment.data?.environmentName ?? null
  const [connectedTab, setConnectedTab] = useState<TabSummary | null>(null)
  const [tabMissing, setTabMissing] = useState(false)

  const readConnectedTab = useCallback(async () => {
    if (launch.mode !== 'window' || tabId === null) {
      return
    }
    const summary = await describeTab(tabId)
    setConnectedTab(summary)
    setTabMissing(summary === null)
  }, [launch.mode, tabId])

  useEffect(() => {
    if (launch.mode !== 'window' || tabId === null) {
      return
    }
    let active = true
    const refresh = () => {
      void describeTab(tabId).then((summary) => {
        if (active) {
          setConnectedTab(summary)
          setTabMissing(summary === null)
        }
      })
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
    }
  }, [launch.mode, tabId])

  useEffect(() => {
    if (launch.mode === 'window') {
      document.title = environmentName ? `Power Tools · ${environmentName}` : 'Power Tools'
    }
  }, [launch.mode, environmentName])

  if (!ready) {
    return <Spinner style={{ padding: '24px' }} />
  }

  const area = resolveArea(currentAreaId)
  const orgOrigin = resolveOrgOrigin(environment.data?.modelDrivenAppUrl ?? null, tabUrl)

  return (
    <>
      <AppNavDrawer
        modules={modules}
        open={drawerOpen}
        selectedAreaId={area.id}
        onOpenChange={setDrawerOpen}
        onNavigate={navigate}
      />
      <AppShell
        breadcrumb={area.breadcrumb}
        tooltip={area.tooltip}
        onOpenNav={() => setDrawerOpen(true)}
        onRefresh={() => {
          if (tabId !== null) {
            void queryClient.invalidateQueries({ queryKey: pageKeys.tab(tabId) })
          }
        }}
        onPin={
          launch.mode === 'popup' && tabId !== null ? () => void pin.run(() => openPinnedWindow(tabId)) : undefined
        }
        onFocusTab={
          launch.mode === 'window' && tabId !== null
            ? () =>
                void goToTab.run(async () => {
                  if (!(await focusTab(tabId))) {
                    setTabMissing(true)
                    throw new Error('That tab has been closed. Reopen Power Tools from the tab you want to work in.')
                  }
                  await readConnectedTab()
                })
            : undefined
        }
        focusTabTooltip={tabMissing ? tabTooltip(null) : tabTooltip(connectedTab)}
        focusTabDisabled={tabMissing}
        environmentName={environmentName}
        actions={<ImpersonationIndicator />}
        banner={launch.mode === 'window' ? <HostAccessBanner origin={orgOrigin} reason={WINDOW_ACCESS_REASON} /> : null}
      >
        <AreaOutlet key={area.id} area={area} />
      </AppShell>
    </>
  )
}
