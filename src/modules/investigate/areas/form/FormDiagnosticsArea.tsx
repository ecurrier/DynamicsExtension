import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  Button,
  Input,
  makeStyles,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components'
import { ArrowClockwise20Regular, Search20Regular } from '@fluentui/react-icons'
import { useMemo, useState } from 'react'

import { usePageQuery } from '@/messaging/client'
import {
  AreaContainer,
  AreaToolbar,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FormStack,
  Grow,
  PageRequirementGate,
} from '@/shared/components'
import {
  type FormBusinessRule,
  type FormControlDiagnostic,
  type FormEventHandler,
  type FormLibrary,
} from '@/shared/types'

import { controlIssue, controlMatches, handlerMatches } from '../../lib'

const useStyles = makeStyles({
  caption: {
    color: tokens.colorNeutralForeground3,
  },
  mono: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
})

export const FormDiagnosticsArea = () => {
  const styles = useStyles()
  const [filter, setFilter] = useState('')
  const diagnostics = usePageQuery('forms.getFormDiagnostics', undefined)

  const data = diagnostics.data ?? null
  const controls = useMemo(
    () => (data?.controls ?? []).filter((control) => controlMatches(control, filter)),
    [data, filter],
  )
  const handlers = useMemo(
    () => (data?.handlers ?? []).filter((handler) => handlerMatches(handler, filter)),
    [data, filter],
  )
  const flagged = useMemo(() => (data?.controls ?? []).filter((control) => controlIssue(control) !== null), [data])

  const controlColumns = useMemo<DataTableColumn<FormControlDiagnostic>[]>(
    () => [
      {
        id: 'label',
        label: 'Control',
        width: 190,
        render: (control) => <span title={control.name}>{control.label}</span>,
        sortValue: (control) => control.label,
      },
      {
        id: 'name',
        label: 'Logical name',
        width: 180,
        render: (control) => <span className={styles.mono}>{control.name}</span>,
        sortValue: (control) => control.name,
      },
      {
        id: 'issue',
        label: 'State',
        width: 180,
        render: (control) => {
          const issue = controlIssue(control)
          return issue ? (
            <Badge appearance="tint" size="small" color={control.visible ? 'warning' : 'danger'}>
              {issue}
            </Badge>
          ) : (
            <Badge appearance="tint" size="small" color="success">
              Editable
            </Badge>
          )
        },
        sortValue: (control) => controlIssue(control) ?? 'zz',
      },
      {
        id: 'required',
        label: 'Required',
        width: 100,
        render: (control) => control.requiredLevel,
        sortValue: (control) => control.requiredLevel,
      },
      {
        id: 'location',
        label: 'Tab / section',
        width: 220,
        render: (control) => [control.tab, control.section].filter(Boolean).join(' › ') || '—',
        sortValue: (control) => `${control.tab ?? ''}${control.section ?? ''}`,
      },
      {
        id: 'type',
        label: 'Type',
        width: 130,
        render: (control) => control.controlType,
        sortValue: (control) => control.controlType,
      },
    ],
    [styles],
  )

  const handlerColumns = useMemo<DataTableColumn<FormEventHandler>[]>(
    () => [
      {
        id: 'event',
        label: 'Event',
        width: 120,
        render: (handler) => (
          <Badge appearance="tint" size="small">
            {handler.event}
          </Badge>
        ),
        sortValue: (handler) => handler.event,
      },
      {
        id: 'target',
        label: 'On column',
        width: 150,
        render: (handler) => <span className={styles.mono}>{handler.target ?? '—'}</span>,
        sortValue: (handler) => handler.target,
      },
      {
        id: 'function',
        label: 'Function',
        width: 220,
        render: (handler) => <span className={styles.mono}>{handler.functionName}</span>,
        sortValue: (handler) => handler.functionName,
      },
      {
        id: 'library',
        label: 'Library',
        width: 200,
        render: (handler) => <span className={styles.mono}>{handler.library}</span>,
        sortValue: (handler) => handler.library,
      },
      {
        id: 'order',
        label: 'Order',
        width: 70,
        render: (handler) => String(handler.order),
        sortValue: (handler) => handler.order,
      },
      {
        id: 'enabled',
        label: 'Enabled',
        width: 90,
        render: (handler) => (
          <Badge appearance="tint" size="small" color={handler.enabled ? 'success' : 'danger'}>
            {handler.enabled ? 'Yes' : 'No'}
          </Badge>
        ),
        sortValue: (handler) => (handler.enabled ? 1 : 0),
      },
      {
        id: 'context',
        label: 'Passes context',
        width: 120,
        render: (handler) => (handler.passExecutionContext ? 'Yes' : 'No'),
        sortValue: (handler) => (handler.passExecutionContext ? 1 : 0),
      },
    ],
    [styles],
  )

  const libraryColumns = useMemo<DataTableColumn<FormLibrary>[]>(
    () => [
      { id: 'order', label: '#', width: 50, render: (library) => String(library.order), sortValue: (l) => l.order },
      {
        id: 'name',
        label: 'Web resource',
        width: 380,
        render: (library) => <span className={styles.mono}>{library.name}</span>,
        sortValue: (library) => library.name,
      },
    ],
    [styles],
  )

  const ruleColumns = useMemo<DataTableColumn<FormBusinessRule>[]>(
    () => [
      { id: 'name', label: 'Business rule', width: 300, render: (rule) => rule.name, sortValue: (rule) => rule.name },
      {
        id: 'state',
        label: 'State',
        width: 100,
        render: (rule) => (
          <Badge appearance="tint" size="small" color={rule.enabled ? 'success' : 'danger'}>
            {rule.enabled ? 'On' : 'Off'}
          </Badge>
        ),
        sortValue: (rule) => (rule.enabled ? 1 : 0),
      },
      {
        id: 'scope',
        label: 'Scope',
        width: 200,
        render: (rule) => rule.scopeLabel,
        sortValue: (rule) => rule.scopeLabel,
      },
    ],
    [],
  )

  return (
    <AreaContainer>
      <PageRequirementGate requires="model-driven-app">
        <FormStack>
          <AreaToolbar>
            <Grow>
              <Input
                contentBefore={<Search20Regular />}
                placeholder="Filter controls and handlers..."
                value={filter}
                onChange={(_, input) => setFilter(input.value)}
              />
            </Grow>
            <Tooltip content="Re-read the form" relationship="label">
              <Button
                icon={<ArrowClockwise20Regular />}
                disabled={diagnostics.isFetching}
                onClick={() => void diagnostics.refetch()}
                aria-label="Re-read the form"
              />
            </Tooltip>
          </AreaToolbar>
          {diagnostics.isError ? <EmptyState intent="error" title={diagnostics.error.message} /> : null}
          {data ? (
            <>
              <Text size={200} className={styles.caption}>
                {`${data.formName} · ${data.entityLogicalName} · ${data.libraries.length} librar${data.libraries.length === 1 ? 'y' : 'ies'}, ` +
                  `${data.handlers.length} handler${data.handlers.length === 1 ? '' : 's'}, ${flagged.length} control${flagged.length === 1 ? '' : 's'} hidden or read-only`}
              </Text>
              {data.formXmlUnavailable ? (
                <EmptyState
                  intent="warning"
                  title={`Scripts and libraries could not be read from the form definition: ${data.formXmlUnavailable}`}
                />
              ) : null}
              <Accordion collapsible multiple defaultOpenItems={['controls']}>
                <AccordionItem value="controls">
                  <AccordionHeader>{`Controls (${controls.length})`}</AccordionHeader>
                  <AccordionPanel>
                    <DataTable
                      items={controls}
                      columns={controlColumns}
                      getRowId={(control) => `${control.tab ?? ''}:${control.section ?? ''}:${control.name}`}
                      maxHeight="260px"
                      emptyMessage="No controls match the filter"
                    />
                  </AccordionPanel>
                </AccordionItem>
                <AccordionItem value="handlers">
                  <AccordionHeader>{`Event handlers (${handlers.length})`}</AccordionHeader>
                  <AccordionPanel>
                    <DataTable
                      items={handlers}
                      columns={handlerColumns}
                      getRowId={(handler) =>
                        `${handler.event}:${handler.target ?? ''}:${handler.order}:${handler.functionName}`
                      }
                      maxHeight="260px"
                      emptyMessage="No script handlers are registered on this form"
                    />
                  </AccordionPanel>
                </AccordionItem>
                <AccordionItem value="libraries">
                  <AccordionHeader>{`Script libraries (${data.libraries.length})`}</AccordionHeader>
                  <AccordionPanel>
                    <DataTable
                      items={data.libraries}
                      columns={libraryColumns}
                      getRowId={(library) => library.name}
                      maxHeight="200px"
                      emptyMessage="No JavaScript libraries are attached to this form"
                    />
                  </AccordionPanel>
                </AccordionItem>
                <AccordionItem value="rules">
                  <AccordionHeader>{`Business rules (${data.businessRules.length})`}</AccordionHeader>
                  <AccordionPanel>
                    {data.businessRulesUnavailable ? (
                      <EmptyState intent="warning" title={data.businessRulesUnavailable} />
                    ) : (
                      <DataTable
                        items={data.businessRules}
                        columns={ruleColumns}
                        getRowId={(rule) => rule.id}
                        maxHeight="200px"
                        emptyMessage="No business rules target this table"
                      />
                    )}
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </>
          ) : (
            <Text size={200} className={styles.caption}>
              {diagnostics.isFetching ? 'Reading the form...' : 'Open a record form to inspect it.'}
            </Text>
          )}
        </FormStack>
      </PageRequirementGate>
    </AreaContainer>
  )
}
