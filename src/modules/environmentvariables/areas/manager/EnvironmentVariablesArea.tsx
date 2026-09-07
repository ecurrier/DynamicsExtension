import { Badge, Button, Dropdown, Input, makeStyles, Option, Text, tokens, Tooltip } from '@fluentui/react-components'
import { ArrowClockwise20Regular, Search20Regular } from '@fluentui/react-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useConnectableEnvironments, useExtensionSettings } from '@/modules/settings'
import {
  AreaContainer,
  AreaToolbar,
  ConnectionPicker,
  DataTable,
  type DataTableColumn,
  FormRow,
  FormStack,
  Grow,
  PageRequirementGate,
  useAppToast,
  useConfirm,
} from '@/shared/components'
import { type ConnectionTarget, requestEnvironmentAccess } from '@/shared/connections'
import { useAsyncAction } from '@/shared/hooks'
import {
  type ClearEnvironmentVariableValueRequest,
  ENVIRONMENT_VARIABLE_TYPE_LABELS,
  ENVIRONMENT_VARIABLE_TYPES,
  type EnvironmentVariable,
  type EnvironmentVariableType,
  type SetEnvironmentVariableValueRequest,
} from '@/shared/types'

import { VariableEditor } from './VariableEditor'
import { useEnvironmentVariablesGateway } from '../../hooks'
import { effectiveValue, variableMatches } from '../../lib'
import { useEnvironmentVariablesStore } from '../../store'

const ALL_TYPES = '__all__'
const PREVIEW_LENGTH = 60

const useStyles = makeStyles({
  caption: {
    color: tokens.colorNeutralForeground3,
  },
  activeRow: {
    outline: `2px solid ${tokens.colorBrandStroke1}`,
    outlineOffset: '-2px',
  },
  valueCell: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
  },
  mono: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
})

const preview = (value: string | null): string =>
  value === null ? '—' : value.length > PREVIEW_LENGTH ? `${value.slice(0, PREVIEW_LENGTH)}…` : value

export const EnvironmentVariablesArea = () => {
  const styles = useStyles()
  const toast = useAppToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { settings } = useExtensionSettings()
  const { environments, byId } = useConnectableEnvironments()
  const { connection, filter, typeFilter, selectedId, setConnection, setFilter, setTypeFilter, select } =
    useEnvironmentVariablesStore()
  const gateway = useEnvironmentVariablesGateway(connection)
  const connect = useAsyncAction('Could not switch connection')

  const definitions = useQuery({
    queryKey: gateway.key('getDefinitions'),
    queryFn: () => gateway.ops.getDefinitions(),
    enabled: gateway.ready,
    staleTime: 60_000,
    retry: false,
  })
  const variables = useMemo(() => definitions.data ?? [], [definitions.data])
  const filtered = useMemo(
    () => variables.filter((variable) => variableMatches(variable, filter, typeFilter)),
    [variables, filter, typeFilter],
  )
  const selected = variables.find((variable) => variable.id === selectedId) ?? null
  const targetName = gateway.environment?.name ?? 'this environment'

  const invalidate = () => queryClient.invalidateQueries({ queryKey: gateway.key('getDefinitions') })
  const setValue = useMutation({
    mutationFn: (request: SetEnvironmentVariableValueRequest) => gateway.ops.setValue(request),
    onSuccess: async () => {
      await invalidate()
      toast.success('Environment variable value saved')
    },
  })
  const clearValue = useMutation({
    mutationFn: (request: ClearEnvironmentVariableValueRequest) => gateway.ops.clearValue(request),
    onSuccess: async () => {
      await invalidate()
      toast.success('Environment variable value removed', 'Consumers now fall back to the default value')
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

  const onSave = async (variable: EnvironmentVariable, value: string) => {
    if (settings.environmentVariablesRequireSaveConfirmation) {
      const confirmed = await confirm({
        title: 'Save environment variable value?',
        content: (
          <p>
            The current value of <strong>{variable.displayName}</strong> changes immediately for everything in{' '}
            {targetName} that reads it.
          </p>
        ),
        confirmLabel: 'Save',
      })
      if (!confirmed) {
        return
      }
    }
    setValue.mutate({ definitionId: variable.id, valueId: variable.valueId, value })
  }

  const onClear = async (variable: EnvironmentVariable) => {
    if (!variable.valueId) {
      return
    }
    if (settings.environmentVariablesRequireSaveConfirmation) {
      const confirmed = await confirm({
        title: 'Remove the current value?',
        content: (
          <p>
            <strong>{variable.displayName}</strong> falls back to{' '}
            {variable.defaultValue === null ? 'no value' : `its default value "${variable.defaultValue}"`} in{' '}
            {targetName}.
          </p>
        ),
        confirmLabel: 'Remove',
      })
      if (!confirmed) {
        return
      }
    }
    clearValue.mutate({ valueId: variable.valueId })
  }

  const columns = useMemo<DataTableColumn<EnvironmentVariable>[]>(
    () => [
      {
        id: 'name',
        label: 'Name',
        width: 190,
        render: (variable) => <span title={variable.schemaName}>{variable.displayName}</span>,
        sortValue: (variable) => variable.displayName,
      },
      {
        id: 'type',
        label: 'Type',
        width: 90,
        render: (variable) => (
          <Badge appearance="tint" size="small">
            {ENVIRONMENT_VARIABLE_TYPE_LABELS[variable.type]}
          </Badge>
        ),
        sortValue: (variable) => variable.type,
      },
      {
        id: 'value',
        label: 'Value',
        width: 230,
        render: (variable) => {
          const effective = effectiveValue(variable)
          return (
            <span className={styles.valueCell}>
              <span className={styles.mono} title={effective.value ?? undefined}>
                {preview(effective.value)}
              </span>
              {effective.source === 'default' ? (
                <Badge appearance="outline" size="small">
                  default
                </Badge>
              ) : null}
            </span>
          )
        },
        sortValue: (variable) => effectiveValue(variable).value,
      },
      {
        id: 'managed',
        label: 'Managed',
        width: 80,
        render: (variable) =>
          variable.isManaged ? (
            <Badge appearance="tint" size="small" color="informative">
              Managed
            </Badge>
          ) : null,
        sortValue: (variable) => (variable.isManaged ? 1 : 0),
      },
    ],
    [styles],
  )

  const body = (
    <FormStack>
      <AreaToolbar>
        <Grow>
          <Input
            contentBefore={<Search20Regular />}
            placeholder="Filter by name, schema name, or description..."
            value={filter}
            onChange={(_, data) => setFilter(data.value)}
          />
        </Grow>
        <Dropdown
          style={{ minWidth: '140px' }}
          value={typeFilter === null ? 'All types' : ENVIRONMENT_VARIABLE_TYPE_LABELS[typeFilter]}
          selectedOptions={[typeFilter === null ? ALL_TYPES : String(typeFilter)]}
          onOptionSelect={(_, data) =>
            setTypeFilter(
              !data.optionValue || data.optionValue === ALL_TYPES
                ? null
                : (Number(data.optionValue) as EnvironmentVariableType),
            )
          }
        >
          <Option value={ALL_TYPES} text="All types">
            All types
          </Option>
          {ENVIRONMENT_VARIABLE_TYPES.map((type) => (
            <Option key={type} value={String(type)} text={ENVIRONMENT_VARIABLE_TYPE_LABELS[type]}>
              {ENVIRONMENT_VARIABLE_TYPE_LABELS[type]}
            </Option>
          ))}
        </Dropdown>
        <Tooltip content="Reload environment variables" relationship="label">
          <Button
            icon={<ArrowClockwise20Regular />}
            disabled={!gateway.ready || definitions.isFetching}
            onClick={() => void definitions.refetch()}
            aria-label="Reload environment variables"
          />
        </Tooltip>
      </AreaToolbar>
      {definitions.isError ? <Text size={200}>{definitions.error.message}</Text> : null}
      <DataTable
        items={filtered}
        columns={columns}
        getRowId={(variable) => variable.id}
        maxHeight="220px"
        onRowClick={(variable) => select(variable.id)}
        rowClassName={(variable) => (variable.id === selectedId ? styles.activeRow : undefined)}
        emptyMessage={
          definitions.isLoading ? 'Loading environment variables...' : 'No environment variables match the filter'
        }
      />
      <Text size={200} className={styles.caption}>
        {definitions.isFetching ? 'Loading...' : `${filtered.length} of ${variables.length} variables`}
      </Text>
      {selected ? (
        <VariableEditor
          key={selected.id}
          variable={selected}
          saving={setValue.isPending || clearValue.isPending}
          onSave={(value) => void onSave(selected, value)}
          onClear={() => void onClear(selected)}
        />
      ) : (
        <Text size={200} className={styles.caption}>
          Select a variable to view its details and change its current value.
        </Text>
      )}
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
          Values are read and written in {gateway.environment.name} as the configured application user.
        </Text>
      ) : null}
      {gateway.mode === 'page' ? <PageRequirementGate requires="model-driven-app">{body}</PageRequirementGate> : body}
    </AreaContainer>
  )
}
