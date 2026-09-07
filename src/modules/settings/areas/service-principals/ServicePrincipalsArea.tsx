import {
  Dropdown,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Text,
} from '@fluentui/react-components'
import { Add20Regular, Delete20Regular, Save20Regular } from '@fluentui/react-icons'
import { useState } from 'react'

import { AreaContainer, AreaToolbar, Grow, useAppToast, useConfirm } from '@/shared/components'
import { generateGuid } from '@/shared/lib'

import { ServicePrincipalForm } from './ServicePrincipalForm'
import { useEnvironments, useServicePrincipals } from '../../hooks'
import {
  draftFromServicePrincipal,
  EMPTY_PRINCIPAL_DRAFT,
  environmentsUsingPrincipal,
  type PrincipalValidation,
  type ServicePrincipalDraft,
  toServicePrincipal,
  validatePrincipalDraft,
} from '../../lib'

const NEW_PRINCIPAL = '__new__'

export const ServicePrincipalsArea = () => {
  const toast = useAppToast()
  const confirm = useConfirm()
  const { principals, byId, upsert, remove, isSaving } = useServicePrincipals()
  const { environments } = useEnvironments()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ServicePrincipalDraft | null>(null)
  const [validation, setValidation] = useState<PrincipalValidation | null>(null)

  const select = (id: string) => {
    const principal = byId[id]
    setSelectedId(id)
    setDraft(principal ? draftFromServicePrincipal(principal) : null)
    setValidation(null)
  }

  const addNew = () => {
    setSelectedId(NEW_PRINCIPAL)
    setDraft(EMPTY_PRINCIPAL_DRAFT)
    setValidation(null)
  }

  const save = async () => {
    if (!draft) {
      toast.error('Select a service principal or add a new one first')
      return
    }
    const problem = validatePrincipalDraft(draft)
    setValidation(problem)
    if (problem) {
      return
    }
    const id = selectedId && selectedId !== NEW_PRINCIPAL ? selectedId : generateGuid()
    try {
      await upsert(toServicePrincipal(id, draft))
      setSelectedId(id)
      toast.success('Service principal saved')
    } catch (error) {
      toast.error('Could not save the service principal', error)
    }
  }

  const removeSelected = async () => {
    const principal = selectedId ? byId[selectedId] : undefined
    if (!principal) {
      toast.error('Select a saved service principal to remove')
      return
    }
    const usedBy = environmentsUsingPrincipal(principal.id, environments)
    if (usedBy.length > 0) {
      toast.error(
        'The service principal is still assigned',
        `Unassign it from ${usedBy.map((environment) => environment.name).join(', ')} first`,
      )
      return
    }
    const confirmed = await confirm({
      content: `Remove the service principal "${principal.name}"?`,
      confirmLabel: 'Remove',
    })
    if (!confirmed) {
      return
    }
    try {
      await remove(principal.id)
      setSelectedId(null)
      setDraft(null)
      toast.success('Service principal removed')
    } catch (error) {
      toast.error('Could not remove the service principal', error)
    }
  }

  const selectedLabel =
    selectedId === NEW_PRINCIPAL ? 'New service principal' : (selectedId && byId[selectedId]?.name) || ''
  const usedBy = selectedId && selectedId !== NEW_PRINCIPAL ? environmentsUsingPrincipal(selectedId, environments) : []

  return (
    <AreaContainer>
      <MessageBar intent="info" layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>Service principals</MessageBarTitle>
          An app registration that Power Tools signs in with instead of you. Register it once, add it as an application
          user in every environment it should reach, then pick it on those environments under Environments.
        </MessageBarBody>
      </MessageBar>
      <AreaToolbar>
        <Grow>
          <Dropdown
            placeholder="Select a service principal..."
            value={selectedLabel}
            selectedOptions={selectedId ? [selectedId] : []}
            onOptionSelect={(_, data) => data.optionValue && select(data.optionValue)}
          >
            {selectedId === NEW_PRINCIPAL ? (
              <Option value={NEW_PRINCIPAL} text="New service principal">
                New service principal
              </Option>
            ) : null}
            {principals.map((principal) => (
              <Option key={principal.id} value={principal.id} text={principal.name}>
                {principal.name}
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
                Add New Service Principal
              </MenuItem>
              <MenuDivider />
              <MenuItem icon={<Save20Regular />} disabled={!draft || isSaving} onClick={() => void save()}>
                Save Changes
              </MenuItem>
              <MenuItem
                icon={<Delete20Regular />}
                disabled={!selectedId || selectedId === NEW_PRINCIPAL}
                onClick={() => void removeSelected()}
              >
                Remove Service Principal
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </AreaToolbar>
      {draft ? (
        <ServicePrincipalForm draft={draft} validation={validation} usedBy={usedBy} onChange={setDraft} />
      ) : (
        <Text size={200}>
          {principals.length === 0
            ? 'No service principals saved yet. Use Actions > Add New Service Principal to create one.'
            : 'Select a service principal to edit it, or add a new one from the Actions menu.'}
        </Text>
      )}
    </AreaContainer>
  )
}
