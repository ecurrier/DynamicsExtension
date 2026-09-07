import {
  Dropdown,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Option,
  Text,
} from '@fluentui/react-components'
import { Add20Regular, Copy20Regular, Delete20Regular, Save20Regular } from '@fluentui/react-icons'
import { useState } from 'react'

import { invoke, usePageQuery } from '@/messaging/client'
import { AreaContainer, AreaToolbar, Grow, useAppToast, useConfirm } from '@/shared/components'
import { getEnvironmentHttp } from '@/shared/connections'
import { useAsyncAction } from '@/shared/hooks'
import { generateGuid, originOf, whoAmI } from '@/shared/lib'
import { useNavigationStore, useSessionStore } from '@/shared/stores'
import { type EnvironmentAlert } from '@/shared/types'

import { EnvironmentForm } from './EnvironmentForm'
import { useEnvironments, useServicePrincipals } from '../../hooks'
import {
  copyDraft,
  draftFromDetails,
  draftFromEnvironment,
  type DraftValidation,
  EMPTY_DRAFT,
  type EnvironmentDraft,
  toEnvironment,
  validateDraft,
} from '../../lib'

const NEW_ENVIRONMENT = '__new__'

export const EnvironmentsArea = () => {
  const toast = useAppToast()
  const confirm = useConfirm()
  const navigate = useNavigationStore((state) => state.navigate)
  const { environments, byId, upsert, remove, isSaving } = useEnvironments()
  const { principals } = useServicePrincipals()
  const details = usePageQuery('settings.getEnvironmentDetails', undefined)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EnvironmentDraft | null>(null)
  const [validation, setValidation] = useState<DraftValidation | null>(null)
  const connectionTest = useAsyncAction('Connection test failed')
  const alertPreview = useAsyncAction('Could not show the banner')
  const tabId = useSessionStore((state) => state.tabId)
  const tabUrl = useSessionStore((state) => state.tabUrl)
  const pageContext = usePageQuery('global.getPageContext', undefined)
  const canPreviewAlert = tabId !== null && pageContext.data === 'model-driven-app'

  const syncAlert = (environmentId: string, url: string, alert: EnvironmentAlert | null) => {
    const currentOrigin = originOf(tabUrl)
    if (tabId !== null && currentOrigin !== null && currentOrigin === originOf(url)) {
      void invoke(tabId, 'global.showEnvironmentAlert', { environmentId, alert }).catch(() => undefined)
    }
  }

  const previewAlert = () =>
    alertPreview.run(async () => {
      if (tabId === null || !draft?.alert) {
        return
      }
      const result = await invoke(tabId, 'global.showEnvironmentAlert', {
        environmentId: selectedId ?? '__preview__',
        alert: { ...draft.alert, enabled: true },
      })
      if (result.reason === 'no-app') {
        throw new Error('The app on the current page has not finished loading')
      }
      toast.success('Banner shown on the current page', 'Save the environment to keep it')
    })

  const select = (id: string) => {
    const environment = byId[id]
    setSelectedId(id)
    setDraft(environment ? draftFromEnvironment(environment) : null)
    setValidation(null)
  }

  const addNew = () => {
    setSelectedId(NEW_ENVIRONMENT)
    setDraft(details.isSuccess ? draftFromDetails(details.data) : EMPTY_DRAFT)
    setValidation(null)
  }

  const copySelected = () => {
    const environment = selectedId ? byId[selectedId] : undefined
    if (!environment) {
      toast.error('Select a saved environment to copy')
      return
    }
    setSelectedId(NEW_ENVIRONMENT)
    setDraft(copyDraft(environment))
    setValidation(null)
    toast.info('Environment copied', 'Adjust the name and URLs, then save the new environment')
  }

  const save = async () => {
    if (!draft) {
      toast.error('Select an environment or add a new one first')
      return
    }
    const problem = validateDraft(draft)
    setValidation(problem)
    if (problem) {
      return
    }
    const id = selectedId && selectedId !== NEW_ENVIRONMENT ? selectedId : generateGuid()
    const environment = toEnvironment(id, draft)
    try {
      await upsert(environment)
      setSelectedId(id)
      syncAlert(environment.id, environment.modelDrivenAppUrl, environment.alert)
      toast.success('Environment saved')
    } catch (error) {
      toast.error('Could not save the environment', error)
    }
  }

  const testConnection = () =>
    connectionTest.run(async () => {
      if (!draft) {
        return
      }
      const problem = validateDraft(draft)
      setValidation(problem)
      if (problem) {
        throw new Error(problem.message)
      }
      const id = selectedId && selectedId !== NEW_ENVIRONMENT ? selectedId : NEW_ENVIRONMENT
      const http = await getEnvironmentHttp(toEnvironment(id, draft), { forceRefresh: true })
      const identity = await whoAmI(http)
      toast.success('Connection succeeded', `Application user ${identity.UserId}`)
    })

  const removeSelected = async () => {
    const environment = selectedId ? byId[selectedId] : undefined
    if (!environment) {
      toast.error('Select a saved environment to remove')
      return
    }
    const confirmed = await confirm({
      content: `Remove the environment "${environment.name}"?`,
      confirmLabel: 'Remove',
    })
    if (!confirmed) {
      return
    }
    try {
      await remove(environment.id)
      syncAlert(environment.id, environment.modelDrivenAppUrl, null)
      setSelectedId(null)
      setDraft(null)
      toast.success('Environment removed')
    } catch (error) {
      toast.error('Could not remove the environment', error)
    }
  }

  const selectedLabel =
    selectedId === NEW_ENVIRONMENT ? 'New environment' : (selectedId && byId[selectedId]?.name) || ''
  const hasSavedSelection = !!selectedId && selectedId !== NEW_ENVIRONMENT

  return (
    <AreaContainer>
      <AreaToolbar>
        <Grow>
          <Dropdown
            placeholder="Select an environment..."
            value={selectedLabel}
            selectedOptions={selectedId ? [selectedId] : []}
            onOptionSelect={(_, data) => data.optionValue && select(data.optionValue)}
          >
            {selectedId === NEW_ENVIRONMENT ? (
              <Option value={NEW_ENVIRONMENT} text="New environment">
                New environment
              </Option>
            ) : null}
            {environments.map((environment) => (
              <Option key={environment.id} value={environment.id} text={environment.name}>
                {environment.name}
              </Option>
            ))}
          </Dropdown>
        </Grow>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <MenuButton appearance="primary">Actions</MenuButton>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<Add20Regular />} onClick={addNew}>
                Add New Environment
              </MenuItem>
              <MenuItem icon={<Copy20Regular />} disabled={!hasSavedSelection} onClick={copySelected}>
                Copy Environment
              </MenuItem>
              <MenuDivider />
              <MenuItem icon={<Save20Regular />} disabled={!draft || isSaving} onClick={() => void save()}>
                Save Changes
              </MenuItem>
              <MenuItem icon={<Delete20Regular />} disabled={!hasSavedSelection} onClick={() => void removeSelected()}>
                Remove Environment
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </AreaToolbar>
      {draft ? (
        <EnvironmentForm
          draft={draft}
          validation={validation}
          principals={principals}
          testingConnection={connectionTest.running}
          canPreviewAlert={canPreviewAlert}
          previewingAlert={alertPreview.running}
          onChange={setDraft}
          onTestConnection={() => void testConnection()}
          onManagePrincipals={() => navigate('settings.service-principals')}
          onPreviewAlert={() => void previewAlert()}
        />
      ) : (
        <Text size={200}>
          {environments.length === 0
            ? 'No environments saved yet. Use Actions > Add New Environment to create one.'
            : 'Select an environment to edit it, or add a new one from the Actions menu.'}
        </Text>
      )}
    </AreaContainer>
  )
}
