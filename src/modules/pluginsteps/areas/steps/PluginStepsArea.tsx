import {
  Badge,
  Button,
  Dropdown,
  Input,
  makeStyles,
  Option,
  Spinner,
  Switch,
  Text,
  tokens,
  Tooltip,
  Tree,
  TreeItem,
  TreeItemLayout,
} from '@fluentui/react-components'
import { ArrowClockwise20Regular, Pause20Regular, Play20Regular, Search20Regular } from '@fluentui/react-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useConnectableEnvironments, useExtensionSettings } from '@/modules/settings'
import {
  AreaContainer,
  AreaToolbar,
  ConnectionPicker,
  FormRow,
  FormStack,
  Grow,
  PageRequirementGate,
  useAppToast,
  useConfirm,
} from '@/shared/components'
import { type ConnectionTarget, requestEnvironmentAccess } from '@/shared/connections'
import { useAsyncAction } from '@/shared/hooks'
import { type PluginStep, type PluginStepStateChange } from '@/shared/types'

import { usePluginStepsGateway } from '../../hooks'
import {
  allGroupValues,
  assemblyValue,
  groupPluginSteps,
  parseTreeValue,
  type StepStateFilter,
  stepIdsUnder,
  stepSummary,
  stepValue,
  treeCheckedItems,
  typeValue,
  visibleStepIds,
} from '../../lib'
import { usePluginStepsStore } from '../../store'

const STATE_LABELS: Record<StepStateFilter, string> = { all: 'All steps', enabled: 'Enabled', disabled: 'Disabled' }

const useStyles = makeStyles({
  caption: {
    color: tokens.colorNeutralForeground3,
  },
  tree: {
    maxHeight: '300px',
    overflow: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  leaf: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  leafName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  leafSummary: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  aside: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
})

export const PluginStepsArea = () => {
  const styles = useStyles()
  const toast = useAppToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { settings } = useExtensionSettings()
  const { environments, byId } = useConnectableEnvironments()
  const {
    connection,
    filter,
    stateFilter,
    checkedIds,
    openItems,
    setConnection,
    setFilter,
    setStateFilter,
    setChecked,
    clearChecked,
    setOpenItems,
  } = usePluginStepsStore()
  const gateway = usePluginStepsGateway(connection)
  const connect = useAsyncAction('Could not switch connection')

  const steps = useQuery({
    queryKey: gateway.key('getSteps'),
    queryFn: () => gateway.ops.getSteps(),
    enabled: gateway.ready,
    staleTime: 60_000,
    retry: false,
  })
  const all = useMemo(() => steps.data ?? [], [steps.data])
  const groups = useMemo(() => groupPluginSteps(all, filter, stateFilter), [all, filter, stateFilter])
  const filtering = filter.trim() !== ''
  const effectiveOpenItems = useMemo(
    () => (filtering ? allGroupValues(groups) : openItems),
    [filtering, groups, openItems],
  )
  const checkedItems = useMemo(() => treeCheckedItems(groups, checkedIds), [groups, checkedIds])
  const visible = useMemo(() => visibleStepIds(groups), [groups])
  const selectedVisible = useMemo(() => visible.filter((id) => checkedIds.has(id)), [visible, checkedIds])
  const targetName = gateway.environment?.name ?? 'this environment'

  const setState = useMutation({
    mutationFn: (change: PluginStepStateChange) => gateway.ops.setState(change),
    onSuccess: async (result, change) => {
      await queryClient.invalidateQueries({ queryKey: gateway.key('getSteps') })
      clearChecked()
      const verb = change.enabled ? 'enabled' : 'disabled'
      if (result.failed.length > 0) {
        toast.error(
          `${result.updated} step${result.updated === 1 ? '' : 's'} ${verb}, ${result.failed.length} failed`,
          result.failed.map((failure) => failure.message).join('; '),
        )
      } else {
        toast.success(`${result.updated} step${result.updated === 1 ? '' : 's'} ${verb}`)
      }
    },
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

  const applyState = async (ids: string[], enabled: boolean) => {
    if (ids.length === 0) {
      return
    }
    if (settings.pluginStepsRequireToggleConfirmation) {
      const managed = all.filter((step) => ids.includes(step.id) && step.isManaged).length
      const count = `${ids.length} step${ids.length === 1 ? '' : 's'}`
      const confirmed = await confirm({
        title: enabled ? `Enable ${count}?` : `Disable ${count}?`,
        content: (
          <>
            <p>
              {enabled ? 'Enabled steps run' : 'Disabled steps stop running'} for every user in {targetName} as soon as
              the change is saved.
            </p>
            {managed > 0 ? (
              <p>
                <strong>
                  {managed} of them {managed === 1 ? 'is' : 'are'} managed
                </strong>{' '}
                and may be reset by the next solution import.
              </p>
            ) : null}
          </>
        ),
        confirmLabel: enabled ? 'Enable' : 'Disable',
      })
      if (!confirmed) {
        return
      }
    }
    setState.mutate({ ids, enabled })
  }

  const renderStep = (step: PluginStep) => (
    <TreeItem key={step.id} itemType="leaf" value={stepValue(step.id)}>
      <TreeItemLayout
        aside={
          <span className={styles.aside}>
            <Badge appearance="tint" size="small" color={step.enabled ? 'success' : 'danger'}>
              {step.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            {step.isManaged ? (
              <Badge appearance="outline" size="small">
                Managed
              </Badge>
            ) : null}
            <Switch
              checked={step.enabled}
              disabled={setState.isPending}
              aria-label={`${step.enabled ? 'Disable' : 'Enable'} ${step.name}`}
              onClick={(event) => event.stopPropagation()}
              onChange={() => void applyState([step.id], !step.enabled)}
            />
          </span>
        }
      >
        <span className={styles.leaf}>
          <span className={styles.leafName} title={step.name}>
            {step.name}
          </span>
          <span className={styles.leafSummary} title={step.filteringAttributes ?? undefined}>
            {stepSummary(step)}
            {step.filteringAttributes ? ` · ${step.filteringAttributes}` : ''}
          </span>
        </span>
      </TreeItemLayout>
    </TreeItem>
  )

  const body = (
    <FormStack>
      <AreaToolbar>
        <Grow>
          <Input
            contentBefore={<Search20Regular />}
            placeholder="Filter by step, type, message, entity, or assembly..."
            value={filter}
            onChange={(_, data) => setFilter(data.value)}
          />
        </Grow>
        <Dropdown
          style={{ minWidth: '120px' }}
          value={STATE_LABELS[stateFilter]}
          selectedOptions={[stateFilter]}
          onOptionSelect={(_, data) => data.optionValue && setStateFilter(data.optionValue as StepStateFilter)}
        >
          {(Object.keys(STATE_LABELS) as StepStateFilter[]).map((value) => (
            <Option key={value} value={value} text={STATE_LABELS[value]}>
              {STATE_LABELS[value]}
            </Option>
          ))}
        </Dropdown>
        <Tooltip content="Reload plug-in steps" relationship="label">
          <Button
            icon={<ArrowClockwise20Regular />}
            disabled={!gateway.ready || steps.isFetching}
            onClick={() => void steps.refetch()}
            aria-label="Reload plug-in steps"
          />
        </Tooltip>
      </AreaToolbar>
      {steps.isError ? <Text size={200}>{steps.error.message}</Text> : null}
      {steps.isLoading ? <Spinner size="small" label="Loading plug-in steps..." labelPosition="after" /> : null}
      {steps.isSuccess && groups.length === 0 ? (
        <Text size={200}>{all.length === 0 ? 'No plug-in steps were found' : 'No plug-in steps match the filter'}</Text>
      ) : null}
      {groups.length > 0 ? (
        <div className={styles.tree}>
          <Tree
            aria-label="Plug-in steps"
            size="small"
            selectionMode="multiselect"
            openItems={effectiveOpenItems}
            onOpenChange={(_, data) => {
              if (!filtering) {
                setOpenItems([...data.openItems].map(String))
              }
            }}
            checkedItems={checkedItems}
            onCheckedChange={(_, data) => {
              const value = String(data.value)
              const parsed = parseTreeValue(value)
              if (parsed) {
                setChecked(parsed.kind === 'step' ? [parsed.id] : stepIdsUnder(groups, value), data.checked === true)
              }
            }}
          >
            {groups.map((assembly) => (
              <TreeItem key={assembly.key} itemType="branch" value={assemblyValue(assembly.key)}>
                <TreeItemLayout
                  aside={
                    <Text size={200} className={styles.caption}>
                      {assembly.types.reduce((count, type) => count + type.steps.length, 0)} steps
                    </Text>
                  }
                >
                  {assembly.name}
                  {assembly.version ? ` ${assembly.version}` : ''}
                </TreeItemLayout>
                <Tree>
                  {assembly.types.map((type) => (
                    <TreeItem key={type.key} itemType="branch" value={typeValue(assembly.key, type.key)}>
                      <TreeItemLayout>{type.friendlyName ?? type.name}</TreeItemLayout>
                      <Tree>{type.steps.map(renderStep)}</Tree>
                    </TreeItem>
                  ))}
                </Tree>
              </TreeItem>
            ))}
          </Tree>
        </div>
      ) : null}
      <div className={styles.actions}>
        <Text size={200} className={styles.caption}>
          {steps.isFetching
            ? 'Loading...'
            : `${visible.length} of ${all.length} steps · ${selectedVisible.length} selected`}
        </Text>
        <Grow>
          <span />
        </Grow>
        <Button
          size="small"
          icon={<Play20Regular />}
          disabled={selectedVisible.length === 0 || setState.isPending}
          onClick={() => void applyState(selectedVisible, true)}
        >
          Enable selected
        </Button>
        <Button
          size="small"
          icon={<Pause20Regular />}
          disabled={selectedVisible.length === 0 || setState.isPending}
          onClick={() => void applyState(selectedVisible, false)}
        >
          Disable selected
        </Button>
      </div>
    </FormStack>
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
          Steps are read and changed in {gateway.environment.name} as the configured application user.
        </Text>
      ) : null}
      {gateway.mode === 'page' ? <PageRequirementGate requires="model-driven-app">{body}</PageRequirementGate> : body}
    </AreaContainer>
  )
}
