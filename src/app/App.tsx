import { Spinner } from '@fluentui/react-components'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import { pageKeys, usePageQuery } from '@/messaging/client'
import { modules, resolveArea } from '@/modules'
import { ImpersonationIndicator } from '@/modules/impersonation'
import { AppNavDrawer, AppShell, HostAccessBanner } from '@/shared/components'
import { openPinnedWindow, readPopupLaunch } from '@/shared/extension'
import { useAsyncAction } from '@/shared/hooks'
import { resolveOrgOrigin } from '@/shared/lib'
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
  const environmentName = environment.data?.environmentName ?? null

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
        environmentName={environmentName}
        actions={<ImpersonationIndicator />}
        banner={launch.mode === 'window' ? <HostAccessBanner origin={orgOrigin} reason={WINDOW_ACCESS_REASON} /> : null}
      >
        <AreaOutlet key={area.id} area={area} />
      </AppShell>
    </>
  )
}
