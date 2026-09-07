import {
  Dropdown,
  Field,
  makeStyles,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components'
import { Checkmark20Regular, Person20Regular } from '@fluentui/react-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useConnectableEnvironments, useExtensionSettings } from '@/modules/settings'
import {
  AreaContainer,
  AreaToolbar,
  ConnectionPicker,
  FormRow,
  Grow,
  PageRequirementGate,
  useAppToast,
  useConfirm,
  UserPicker,
} from '@/shared/components'
import { type ConnectionTarget, requestEnvironmentAccess } from '@/shared/connections'
import { useAsyncAction } from '@/shared/hooks'
import { type RoleChangeSet, type SystemUser } from '@/shared/types'

import { PendingChangesList } from './PendingChangesList'
import { RoleTable } from './RoleTable'
import { useSecurityGateway } from '../../hooks'
import { resolveBusinessUnitId, rolesViewModel } from '../../lib'
import { useSecurityStore } from '../../store'

const useStyles = makeStyles({
  body: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(200px, 1fr)',
    gap: '12px',
    alignItems: 'start',
  },
  caption: {
    color: tokens.colorNeutralForeground3,
  },
})

export const RolesArea = () => {
  const styles = useStyles()
  const toast = useAppToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { settings } = useExtensionSettings()
  const { environments, byId } = useConnectableEnvironments()
  const {
    connection,
    selectedBusinessUnitId,
    selectedUser,
    searchResults,
    staged,
    setConnection,
    setBusinessUnit,
    setSearchResults,
    selectUser,
    setStaged,
    clearStaged,
  } = useSecurityStore()
  const gateway = useSecurityGateway(connection)

  const businessUnits = useQuery({
    queryKey: gateway.key('getBusinessUnits'),
    queryFn: () => gateway.ops.getBusinessUnits(),
    enabled: gateway.ready,
    staleTime: Infinity,
    retry: false,
  })
  const allRoles = useQuery({
    queryKey: gateway.key('getSecurityRoles'),
    queryFn: () => gateway.ops.getSecurityRoles(),
    enabled: gateway.ready,
    staleTime: Infinity,
    retry: false,
  })
  const businessUnitId = resolveBusinessUnitId(selectedBusinessUnitId, businessUnits.data ?? [])
  const userRolesArgs = { systemUserId: selectedUser?.id ?? '', businessUnitId: businessUnitId ?? '' }
  const userRoles = useQuery({
    queryKey: gateway.key('getUserSecurityRoles', userRolesArgs),
    queryFn: () => gateway.ops.getUserSecurityRoles(userRolesArgs),
    enabled: gateway.ready && !!selectedUser && !!businessUnitId,
    retry: false,
  })

  const model = rolesViewModel({
    selectedUser,
    selectedBusinessUnitId,
    businessUnits: businessUnits.data ?? [],
    allRoles: allRoles.data ?? [],
    userRoles: userRoles.data ?? [],
    staged,
    requireRemovalConfirmation: settings.securityRequireRemovalConfirmation,
  })

  const search = useMutation({
    mutationFn: (query: string) => gateway.ops.searchSystemUsers({ query }),
    onSuccess: (users) => {
      setSearchResults(users)
      selectUser(null)
      toast.success(`Found ${users.length} user${users.length === 1 ? '' : 's'}`)
    },
  })
  const apply = useMutation({
    mutationFn: (changes: RoleChangeSet) => gateway.ops.applySecurityRoleChanges(changes),
    onSuccess: async (_, changes) => {
      await queryClient.invalidateQueries({
        queryKey: gateway.key('getUserSecurityRoles', {
          systemUserId: changes.systemUserId,
          businessUnitId: businessUnitId ?? '',
        }),
      })
      if (gateway.mode === 'page') {
        await queryClient.invalidateQueries({ queryKey: gateway.key('getCurrentUser') })
      }
      clearStaged()
      toast.success('Security role changes applied')
    },
  })
  const loadMyUser = useAsyncAction('Could not load your user')
  const connect = useAsyncAction('Could not switch connection')

  const onLoadMyUser = () =>
    loadMyUser.run(async () => {
      if (gateway.mode !== 'page') {
        return
      }
      const current = await gateway.ops.getCurrentUser()
      const user: SystemUser = {
        id: current.userId,
        fullName: current.userName,
        azureAdObjectId: null,
        domainName: null,
        isDisabled: false,
      }
      if (!searchResults.some((candidate) => candidate.id === user.id)) {
        setSearchResults([user, ...searchResults])
      }
      selectUser(user)
    })

  const onConnectionChange = (target: ConnectionTarget) =>
    connect.run(async () => {
      if (target.kind === 'environment') {
        const environment = byId[target.environmentId]
        if (!environment) {
          throw new Error('The selected environment no longer exists')
        }
        if (!(await requestEnvironmentAccess(environment))) {
          throw new Error('Power Tools needs permission to contact the environment and the Microsoft login service')
        }
      }
      setConnection(target)
    })

  const onApply = async () => {
    if (!selectedUser || !model.changeSet || !model.hasChanges) {
      toast.info('No security role changes to apply')
      return
    }
    if (model.needsRemovalConfirmation) {
      const confirmed = await confirm({
        title: 'Remove security roles?',
        content: (
          <>
            <p>You have selected to remove one or more security roles from {selectedUser.fullName}.</p>
            <p>Removing security roles may result in a loss of access to certain system functionality.</p>
            <p>
              <strong>Confirm that you would like to proceed with removing the selected security roles.</strong>
            </p>
          </>
        ),
        confirmLabel: 'Remove roles',
      })
      if (!confirmed) {
        return
      }
    }
    apply.mutate(model.changeSet)
  }

  const businessUnitLabel = businessUnits.data?.find((unit) => unit.id === businessUnitId)?.name ?? ''
  const loadError = businessUnits.error ?? allRoles.error ?? userRoles.error

  const body = (
    <>
      <AreaToolbar>
        <Grow>
          <Field label="Business Unit">
            <Dropdown
              placeholder={businessUnits.isLoading ? 'Loading business units...' : 'Select a business unit...'}
              value={businessUnitLabel}
              selectedOptions={businessUnitId ? [businessUnitId] : []}
              disabled={!businessUnits.data || businessUnits.data.length <= 1}
              onOptionSelect={(_, data) => setBusinessUnit(data.optionValue ?? null)}
            >
              {(businessUnits.data ?? []).map((unit) => (
                <Option key={unit.id} value={unit.id} text={unit.name}>
                  {unit.name}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </Grow>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <MenuButton appearance="primary">Actions</MenuButton>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {gateway.mode === 'page' ? (
                <MenuItem icon={<Person20Regular />} disabled={loadMyUser.running} onClick={() => void onLoadMyUser()}>
                  Load My User
                </MenuItem>
              ) : null}
              <MenuItem
                icon={<Checkmark20Regular />}
                disabled={apply.isPending || !model.canApply}
                onClick={() => void onApply()}
              >
                Apply Changes
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </AreaToolbar>
      <UserPicker
        users={searchResults}
        selectedUser={selectedUser}
        searching={search.isPending}
        onSearch={(query) => search.mutate(query)}
        onSelect={selectUser}
      />
      {loadError ? <Text size={200}>{loadError.message}</Text> : null}
      <div className={styles.body}>
        <RoleTable
          roles={model.roles}
          assignedIds={model.assignedIds}
          stagedIds={model.stagedIds}
          enabled={!!selectedUser && !!businessUnitId && userRoles.isSuccess}
          onStagedChange={(roleIds) => setStaged(model.stagingKey, roleIds)}
        />
        <PendingChangesList
          roles={model.roles}
          assignedIds={model.assignedIds}
          stagedIds={model.stagedIds}
          userSelected={!!selectedUser}
        />
      </div>
    </>
  )

  return (
    <AreaContainer>
      <FormRow>
        <Grow>
          <ConnectionPicker
            value={connection}
            environments={environments}
            disabled={connect.running}
            onChange={(target) => void onConnectionChange(target)}
          />
        </Grow>
      </FormRow>
      {gateway.environment ? (
        <Text size={200} className={styles.caption}>
          Changes run against {gateway.environment.name} as the configured application user, so your own roles on the
          current page are not required.
        </Text>
      ) : null}
      {gateway.mode === 'page' ? <PageRequirementGate requires="model-driven-app">{body}</PageRequirementGate> : body}
    </AreaContainer>
  )
}
