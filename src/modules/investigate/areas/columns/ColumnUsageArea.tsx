import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  Button,
  Combobox,
  Field,
  makeStyles,
  Option,
  Switch,
  Text,
  tokens,
} from '@fluentui/react-components'
import { Search20Regular } from '@fluentui/react-icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import {
  AreaContainer,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FormRow,
  FormStack,
  Grow,
  InfoTip,
  PageRequirementGate,
  useAppToast,
} from '@/shared/components'
import {
  type DependentComponent,
  type FlowReference,
  type StepReference,
  type TransportAttribute,
} from '@/shared/types'

import { InvestigateConnection, TablePicker } from '../../components'
import { useInvestigateGateway } from '../../hooks'
import { useInvestigateStore } from '../../store'

const MAX_OPTIONS = 60

const useStyles = makeStyles({
  caption: {
    color: tokens.colorNeutralForeground3,
  },
  mono: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
})

export const ColumnUsageArea = () => {
  const styles = useStyles()
  const toast = useAppToast()
  const connection = useInvestigateStore((state) => state.connection)
  const table = useInvestigateStore((state) => state.table)
  const column = useInvestigateStore((state) => state.column)
  const setColumn = useInvestigateStore((state) => state.setColumn)
  const scanFlows = useInvestigateStore((state) => state.scanFlows)
  const setScanFlows = useInvestigateStore((state) => state.setScanFlows)
  const gateway = useInvestigateGateway(connection)
  const [query, setQuery] = useState('')

  const metadata = useQuery({
    queryKey: gateway.key('getTableColumns', { entityLogicalName: table }),
    queryFn: () => gateway.ops.getTableColumns({ entityLogicalName: table }),
    enabled: gateway.ready && table.trim().length > 0,
    staleTime: 300_000,
    retry: false,
  })

  const usage = useMutation({
    mutationFn: () => gateway.ops.getColumnUsage({ entityLogicalName: table, attributeLogicalName: column, scanFlows }),
    onError: (error) => toast.error('Could not read column usage', error),
  })

  const options = useMemo<TransportAttribute[]>(() => {
    const rows = metadata.data?.attributes ?? []
    const term = query.trim().toLowerCase()
    const matches = term
      ? rows.filter((row) => row.logicalName.includes(term) || row.displayName.toLowerCase().includes(term))
      : rows
    return matches.slice(0, MAX_OPTIONS)
  }, [metadata.data, query])

  const result = usage.data ?? null

  const dependentColumns = useMemo<DataTableColumn<DependentComponent>[]>(
    () => [
      {
        id: 'type',
        label: 'Component',
        width: 150,
        render: (row) => (
          <Badge appearance="tint" size="small">
            {row.componentTypeLabel}
          </Badge>
        ),
        sortValue: (row) => row.componentTypeLabel,
      },
      {
        id: 'name',
        label: 'Name',
        width: 300,
        render: (row) => row.name ?? <span className={styles.mono}>{row.id}</span>,
        sortValue: (row) => row.name ?? row.id,
      },
    ],
    [styles],
  )

  const flowColumns = useMemo<DataTableColumn<FlowReference>[]>(
    () => [
      { id: 'name', label: 'Cloud flow', width: 300, render: (row) => row.name, sortValue: (row) => row.name },
      {
        id: 'state',
        label: 'State',
        width: 100,
        render: (row) => (
          <Badge appearance="tint" size="small" color={row.enabled ? 'success' : 'danger'}>
            {row.enabled ? 'On' : 'Off'}
          </Badge>
        ),
        sortValue: (row) => (row.enabled ? 1 : 0),
      },
      {
        id: 'managed',
        label: 'Managed',
        width: 90,
        render: (row) => (row.isManaged ? 'Yes' : 'No'),
        sortValue: (row) => (row.isManaged ? 1 : 0),
      },
    ],
    [],
  )

  const stepColumns = useMemo<DataTableColumn<StepReference>[]>(
    () => [
      { id: 'name', label: 'Plug-in step', width: 300, render: (row) => row.name, sortValue: (row) => row.name },
      {
        id: 'message',
        label: 'Message',
        width: 120,
        render: (row) => row.messageName,
        sortValue: (row) => row.messageName,
      },
      {
        id: 'filters',
        label: 'Filtering columns',
        width: 240,
        render: (row) => <span className={styles.mono}>{row.filteringAttributes}</span>,
        sortValue: (row) => row.filteringAttributes,
      },
    ],
    [styles],
  )

  const body = (
    <FormStack>
      <TablePicker />
      <FormRow>
        <Grow>
          <Field label="Column">
            <Combobox
              freeform
              value={query || column}
              selectedOptions={column ? [column] : []}
              disabled={!table}
              placeholder={metadata.isLoading ? 'Loading columns...' : 'statuscode'}
              onOptionSelect={(_, data) => {
                if (data.optionValue) {
                  setColumn(data.optionValue)
                  setQuery('')
                }
              }}
              onChange={(event) => {
                const typed = event.target.value
                setQuery(typed)
                setColumn(typed.trim().toLowerCase())
              }}
            >
              {options.map((option) => (
                <Option key={option.logicalName} value={option.logicalName} text={option.logicalName}>
                  {`${option.displayName} (${option.logicalName})`}
                </Option>
              ))}
            </Combobox>
          </Field>
        </Grow>
        <Switch
          label={
            <>
              Scan cloud flows
              <InfoTip content="Reads the definition of every cloud flow in the environment and looks for the column name. Slower, but it is the only way to see flow dependencies, which the platform's own Show Dependencies does not report." />
            </>
          }
          checked={scanFlows}
          onChange={(_, data) => setScanFlows(data.checked)}
        />
        <Button
          appearance="primary"
          icon={<Search20Regular />}
          disabled={!gateway.ready || !table || !column || usage.isPending}
          onClick={() => usage.mutate()}
        >
          {usage.isPending ? 'Scanning...' : 'Find usage'}
        </Button>
      </FormRow>
      {!result ? (
        <Text size={200} className={styles.caption}>
          Pick a column to see every form, view, chart, business rule, plug-in step, and cloud flow that touches it
          before you change or retire it.
        </Text>
      ) : (
        <Accordion collapsible multiple defaultOpenItems={['dependents', 'flows']}>
          <AccordionItem value="dependents">
            <AccordionHeader>{`Platform dependencies (${result.dependents.length})`}</AccordionHeader>
            <AccordionPanel>
              {result.dependentsUnavailable ? (
                <EmptyState intent="warning" title={result.dependentsUnavailable} />
              ) : (
                <DataTable
                  items={result.dependents}
                  columns={dependentColumns}
                  getRowId={(row) => `${row.componentType}:${row.id}`}
                  maxHeight="220px"
                  emptyMessage="No forms, views, charts, or business rules reference this column"
                />
              )}
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem value="flows">
            <AccordionHeader>{`Cloud flows (${result.flows.length})`}</AccordionHeader>
            <AccordionPanel>
              <FormStack>
                {result.flowsUnavailable ? <EmptyState intent="warning" title={result.flowsUnavailable} /> : null}
                <DataTable
                  items={result.flows}
                  columns={flowColumns}
                  getRowId={(row) => row.id}
                  maxHeight="220px"
                  emptyMessage={
                    scanFlows ? 'No cloud flow definition mentions this column' : 'Cloud flow scanning is switched off'
                  }
                />
                {scanFlows ? (
                  <Text size={200} className={styles.caption}>
                    {`Scanned ${result.flowsScanned} cloud flow definition${result.flowsScanned === 1 ? '' : 's'} as text.`}
                  </Text>
                ) : null}
              </FormStack>
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem value="steps">
            <AccordionHeader>{`Plug-in step filters (${result.steps.length})`}</AccordionHeader>
            <AccordionPanel>
              {result.stepsUnavailable ? (
                <EmptyState intent="warning" title={result.stepsUnavailable} />
              ) : (
                <DataTable
                  items={result.steps}
                  columns={stepColumns}
                  getRowId={(row) => row.id}
                  maxHeight="220px"
                  emptyMessage="No plug-in step filters on this column"
                />
              )}
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
    </FormStack>
  )

  return (
    <AreaContainer>
      <InvestigateConnection />
      {gateway.mode === 'page' ? <PageRequirementGate requires="model-driven-app">{body}</PageRequirementGate> : body}
    </AreaContainer>
  )
}
