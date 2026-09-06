import { Badge, makeStyles, mergeClasses, tokens } from '@fluentui/react-components'
import { useMemo } from 'react'

import { type DataTableColumn } from '@/shared/components'
import { modeLabel } from '@/shared/lib'
import { type PluginTraceLog } from '@/shared/types'

import { formatDuration, formatTraceTime, shortId } from './lib'

const useStyles = makeStyles({
  mono: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  highlight: {
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: tokens.colorNeutralForeground1,
    borderRadius: tokens.borderRadiusSmall,
    padding: '0 3px',
  },
})

export const useTraceColumns = (highlightedGuid: string | null): DataTableColumn<PluginTraceLog>[] => {
  const styles = useStyles()
  return useMemo(
    () => [
      {
        id: 'createdOn',
        label: 'Created On',
        width: 150,
        render: (trace) => formatTraceTime(trace.createdOn),
        sortValue: (trace) => trace.createdOn,
      },
      {
        id: 'typeName',
        label: 'Type Name',
        width: 260,
        render: (trace) => (
          <span style={{ paddingLeft: `${Math.max(0, trace.depth - 1) * 12}px` }} title={trace.typeName}>
            {trace.typeName}
          </span>
        ),
        sortValue: (trace) => trace.typeName,
      },
      {
        id: 'messageName',
        label: 'Message',
        width: 100,
        render: (trace) => trace.messageName,
        sortValue: (trace) => trace.messageName,
      },
      {
        id: 'primaryEntity',
        label: 'Entity',
        width: 110,
        render: (trace) => trace.primaryEntity,
        sortValue: (trace) => trace.primaryEntity,
      },
      {
        id: 'mode',
        label: 'Mode',
        width: 70,
        render: (trace) => modeLabel(trace.mode),
        sortValue: (trace) => trace.mode,
      },
      { id: 'depth', label: 'Depth', width: 60, render: (trace) => trace.depth, sortValue: (trace) => trace.depth },
      {
        id: 'duration',
        label: 'Duration',
        width: 90,
        render: (trace) => formatDuration(trace.executionDurationMs),
        sortValue: (trace) => trace.executionDurationMs,
      },
      {
        id: 'exception',
        label: 'Exception',
        width: 100,
        render: (trace) =>
          trace.exceptionDetails ? (
            <Badge appearance="tint" color="danger" size="small">
              Exception
            </Badge>
          ) : null,
        sortValue: (trace) => (trace.exceptionDetails ? 1 : 0),
      },
      {
        id: 'correlation',
        label: 'Correlation',
        width: 110,
        render: (trace) =>
          trace.correlationId ? (
            <span
              className={mergeClasses(styles.mono, trace.correlationId === highlightedGuid && styles.highlight)}
              title={trace.correlationId}
            >
              {shortId(trace.correlationId)}
            </span>
          ) : (
            '—'
          ),
        sortValue: (trace) => trace.correlationId,
      },
      {
        id: 'pluginStep',
        label: 'Step',
        width: 90,
        render: (trace) =>
          trace.pluginStepId ? (
            <span
              className={mergeClasses(styles.mono, trace.pluginStepId === highlightedGuid && styles.highlight)}
              title={trace.pluginStepId}
            >
              {shortId(trace.pluginStepId)}
            </span>
          ) : (
            '—'
          ),
        sortValue: (trace) => trace.pluginStepId,
      },
    ],
    [highlightedGuid, styles],
  )
}
