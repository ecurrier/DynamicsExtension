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
import { Add20Regular, Delete20Regular, Save20Regular } from '@fluentui/react-icons'
import { useState } from 'react'

import { usePageQuery } from '@/messaging/client'
import { AreaContainer, AreaToolbar, Grow, useAppToast, useConfirm } from '@/shared/components'
import { getEnvironmentHttp } from '@/shared/connections'
import { useAsyncAction } from '@/shared/hooks'
import { generateGuid, whoAmI } from '@/shared/lib'

import { EnvironmentForm } from './EnvironmentForm'
import { useEnvironments } from '../../hooks'
import {
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
  const { environments, byId, upsert, remove, isSaving } = useEnvironments()
  const details = usePageQuery('settings.getEnvironmentDetails', undefined)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EnvironmentDraft | null>(null)
  const [validation, setValidation] = useState<DraftValidation | null>(null)
  const connectionTest = useAsyncAction('Connection test failed')

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
    try {
      await upsert(toEnvironment(id, draft))
      setSelectedId(id)
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
      setSelectedId(null)
      setDraft(null)
      toast.success('Environment removed')
    } catch (error) {
      toast.error('Could not remove the environment', error)
    }
  }

  const selectedLabel =
    selectedId === NEW_ENVIRONMENT ? 'New environment' : (selectedId && byId[selectedId]?.name) || ''

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
              <MenuDivider />
              <MenuItem icon={<Save20Regular />} disabled={!draft || isSaving} onClick={() => void save()}>
                Save Changes
              </MenuItem>
              <MenuItem
                icon={<Delete20Regular />}
                disabled={!selectedId || selectedId === NEW_ENVIRONMENT}
                onClick={() => void removeSelected()}
              >
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
          testingConnection={connectionTest.running}
          onChange={setDraft}
          onTestConnection={() => void testConnection()}
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
