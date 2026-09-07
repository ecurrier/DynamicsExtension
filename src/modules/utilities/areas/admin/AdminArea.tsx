import {
  ArrowSync20Regular,
  DocumentEdit20Regular,
  Info20Regular,
  Layer20Regular,
  Link20Regular,
  LockOpen20Regular,
  Rename20Regular,
  Settings20Regular,
  Wrench20Regular,
} from '@fluentui/react-icons'
import { useState } from 'react'

import { usePageFetcher, usePageMutation } from '@/messaging/client'
import { useExtensionSettings } from '@/modules/settings'
import { TaskCard, TaskGrid, useAppToast, useSelectDialog } from '@/shared/components'
import { openUrl } from '@/shared/extension'
import { useAsyncAction } from '@/shared/hooks'
import {
  type AdminModeResult,
  type EnvironmentDetails,
  type GeneratedUrls,
  type SessionSnapshot,
  type SolutionLayers,
} from '@/shared/types'

import { AdminModeDialog, EnvironmentDetailsDialog, SolutionLayersDialog, UrlDialog } from '../../dialogs'
import { useEnvironmentPicker } from '../../hooks'
import { adminCenterUrl, controlEditorUrl, DEFAULT_SOLUTION_ID, makerPortalUrl } from '../../lib'

const COMPONENT_NAMES: Record<string, string> = {
  'form/edit': 'SystemForm',
  view: 'SavedQuery',
}

export const AdminArea = () => {
  const toast = useAppToast()
  const select = useSelectDialog()
  const fetchPage = usePageFetcher()
  const pickEnvironment = useEnvironmentPicker()
  const { settings } = useExtensionSettings()
  const [urls, setUrls] = useState<GeneratedUrls | null>(null)
  const [details, setDetails] = useState<EnvironmentDetails | null>(null)
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null)
  const [adminModeResult, setAdminModeResult] = useState<AdminModeResult | null>(null)
  const [layers, setLayers] = useState<SolutionLayers | null>(null)

  const adminMode = usePageMutation('utilities.enableAdminMode', {
    onSuccess: (result) => {
      setAdminModeResult(result)
      toast.success('Admin mode enabled')
    },
  })
  const restoreForm = usePageMutation('utilities.restoreFormState', {
    onSuccess: (result) => {
      setAdminModeResult(null)
      toast.success(`Restored ${result.restored} control${result.restored === 1 ? '' : 's'}`)
    },
  })
  const logicalNames = usePageMutation('utilities.toggleControlLogicalNames', {
    onSuccess: (result) =>
      toast.success(result.mode === 'logical' ? 'Showing logical names' : 'Showing control labels'),
  })
  const generateUrls = usePageMutation('utilities.generateUrls', { onSuccess: (result) => setUrls(result) })
  const refreshCommandBar = usePageMutation('utilities.refreshCommandBar', {
    onSuccess: () => toast.success('Command bar refreshed'),
  })
  const controlDetails = usePageMutation('utilities.getControlDetails', { silent: true })
  const makerPortal = useAsyncAction('Could not open the maker portal')
  const adminCenter = useAsyncAction('Could not open the admin center')
  const controlEditor = useAsyncAction('Could not open the control editor')
  const environmentDetails = useAsyncAction('Could not load environment details')
  const solutionLayers = useAsyncAction('Could not read the solution layers')

  const openMakerPortal = () =>
    makerPortal.run(async () => {
      const environment = await pickEnvironment(settings.makerPortalUseCurrentEnvironment)
      if (environment) {
        await openUrl(makerPortalUrl(environment.environmentType, environment.environmentId))
      }
    })

  const openAdminCenter = () =>
    adminCenter.run(async () => {
      const environment = await pickEnvironment(settings.adminCenterUseCurrentEnvironment)
      if (environment) {
        await openUrl(adminCenterUrl(environment.environmentType, environment.environmentId))
      }
    })

  const openControlEditor = () =>
    controlEditor.run(async () => {
      const control = await controlDetails.mutateAsync(undefined)
      const current = await fetchPage('settings.getEnvironmentDetails', undefined)
      if (!current.environmentId) {
        throw new Error('The current environment id is unavailable')
      }
      const solutions = await fetchPage('global.getSolutions', undefined)
      const solutionId = settings.controlEditorUseDefaultSolution
        ? (solutions.find((solution) => solution.name === 'Default Solution')?.id ?? DEFAULT_SOLUTION_ID)
        : await select<string>({
            title: 'Select a solution',
            description: 'Select a solution to open the control editor in',
            items: solutions.map((solution) => ({ key: solution.id, label: solution.name, value: solution.id })),
            placeholder: 'Select a solution...',
          })
      if (!solutionId) {
        return
      }
      await openUrl(controlEditorUrl(current.environmentType, current.environmentId, solutionId, control))
    })

  const showEnvironmentDetails = () =>
    environmentDetails.run(async () => {
      setSnapshot(null)
      setDetails(await fetchPage('settings.getEnvironmentDetails', undefined))
      setSnapshot(await fetchPage('utilities.getSessionSnapshot', undefined, { fresh: true }))
    })

  const showSolutionLayers = () =>
    solutionLayers.run(async () => {
      const control = await controlDetails.mutateAsync(undefined)
      const solutionComponentName = COMPONENT_NAMES[control.controlType]
      if (!solutionComponentName) {
        throw new Error('Solution layers are only available for a form or a view')
      }
      setLayers(
        await fetchPage(
          'investigate.getSolutionLayers',
          { componentId: control.id, solutionComponentName },
          { fresh: true },
        ),
      )
    })

  return (
    <>
      <TaskGrid>
        <TaskCard
          title="Enable Admin Mode"
          description="Unlock every field, tab, and section, and report which of them were hidden, read-only, or required."
          icon={LockOpen20Regular}
          loading={adminMode.isPending}
          onAction={() => adminMode.mutate(undefined)}
        />
        <TaskCard
          title="Toggle Logical Names"
          description="Switch form control labels between display names and logical names."
          icon={Rename20Regular}
          loading={logicalNames.isPending}
          onAction={() => logicalNames.mutate(undefined)}
        />
        <TaskCard
          title="Record Links & Debug Flags"
          description="Build record links, the Web API URL, and one-click command checker, form monitor, and perf URLs."
          icon={Link20Regular}
          loading={generateUrls.isPending}
          onAction={() => generateUrls.mutate(undefined)}
        />
        <TaskCard
          title="Solution Layers"
          description="Show the layer stack for the current form or view and flag an unmanaged layer sitting on top."
          icon={Layer20Regular}
          actionLabel="Show"
          loading={solutionLayers.running}
          onAction={() => void showSolutionLayers()}
        />
        <TaskCard
          title="Refresh Command Bar"
          description="Refresh the main command bar of the current record or view."
          icon={ArrowSync20Regular}
          loading={refreshCommandBar.isPending}
          onAction={() => refreshCommandBar.mutate(undefined)}
        />
        <TaskCard
          title="Open Maker Portal"
          description="Open make.powerapps.com for the current or a saved environment."
          icon={Wrench20Regular}
          actionLabel="Open"
          loading={makerPortal.running}
          onAction={() => void openMakerPortal()}
        />
        <TaskCard
          title="Open Form/View Editor"
          description="Open the current form or view in the maker portal designer."
          icon={DocumentEdit20Regular}
          actionLabel="Open"
          loading={controlEditor.running}
          onAction={() => void openControlEditor()}
        />
        <TaskCard
          title="Open Admin Center"
          description="Open the Power Platform Admin Center for the current or a saved environment."
          icon={Settings20Regular}
          actionLabel="Open"
          loading={adminCenter.running}
          onAction={() => void openAdminCenter()}
        />
        <TaskCard
          title="Environment & Session"
          description="Environment, current user, platform diagnostic, and session/app context."
          icon={Info20Regular}
          actionLabel="Show"
          loading={environmentDetails.running}
          onAction={() => void showEnvironmentDetails()}
        />
      </TaskGrid>
      <UrlDialog urls={urls} onClose={() => setUrls(null)} />
      <EnvironmentDetailsDialog
        details={details}
        snapshot={snapshot}
        loading={environmentDetails.running}
        onClose={() => {
          setDetails(null)
          setSnapshot(null)
        }}
      />
      <AdminModeDialog
        result={adminModeResult}
        restoring={restoreForm.isPending}
        onRestore={() => adminModeResult && restoreForm.mutate({ snapshot: adminModeResult.snapshot })}
        onClose={() => setAdminModeResult(null)}
      />
      <SolutionLayersDialog layers={layers} onClose={() => setLayers(null)} />
    </>
  )
}
