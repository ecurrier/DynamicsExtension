import { makeStyles, mergeClasses, Portal, Spinner, Tab, TabList, Text, tokens } from '@fluentui/react-components'
import { type CSSProperties, type RefObject, useEffect } from 'react'

import { type LookupTarget } from '@/shared/types'

import { highlightSegments } from './highlightSegments'
import { type UseRecordSearchReturn } from './useRecordSearch'

const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow16,
    overflow: 'hidden',
  },
  caption: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    color: tokens.colorNeutralForeground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  scroll: {
    overflowY: 'auto',
    minHeight: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1.4fr)',
    columnGap: '8px',
    alignItems: 'center',
    padding: '6px 10px',
  },
  head: {
    position: 'sticky',
    top: 0,
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  list: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
  },
  row: {
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase300,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  rowFocused: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  cell: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  primary: {
    fontWeight: tokens.fontWeightSemibold,
  },
  mono: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  mark: {
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: 'inherit',
    borderRadius: '2px',
  },
  empty: {
    display: 'block',
    padding: '12px 10px',
    color: tokens.colorNeutralForeground3,
  },
})

interface RecordLookupPanelProps {
  id: string
  lookup: UseRecordSearchReturn
  targets: LookupTarget[]
  style: CSSProperties
  panelRef: RefObject<HTMLDivElement | null>
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })

const formatDate = (value: string | null): string => {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

const captionFor = (lookup: UseRecordSearchReturn): string => {
  if (lookup.error) {
    return 'Search failed'
  }
  if (lookup.loading) {
    return lookup.query ? 'Searching...' : 'Loading recent records...'
  }
  if (lookup.results.length === 0) {
    return 'No matches'
  }
  if (lookup.query) {
    return `${lookup.results.length} result${lookup.results.length === 1 ? '' : 's'}`
  }
  return 'Recent records'
}

export const RecordLookupPanel = ({ id, lookup, targets, style, panelRef }: RecordLookupPanelProps) => {
  const styles = useStyles()
  const { results, focusedIndex, loading, error, query } = lookup

  useEffect(() => {
    if (focusedIndex < 0) {
      return
    }
    document.getElementById(`${id}-option-${focusedIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [id, focusedIndex])

  return (
    <Portal>
      <div ref={panelRef} className={styles.panel} style={style} onMouseDown={(event) => event.preventDefault()}>
        {targets.length > 1 ? (
          <TabList
            size="small"
            selectedValue={lookup.activeTarget}
            onTabSelect={(_, data) => lookup.selectTarget(String(data.value))}
          >
            {targets.map((target) => (
              <Tab key={target.logicalName} value={target.logicalName}>
                {lookup.entityInfos[target.logicalName]?.displayName ?? target.logicalName}
              </Tab>
            ))}
          </TabList>
        ) : null}
        <div className={styles.caption} aria-live="polite">
          {loading ? <Spinner size="extra-tiny" /> : null}
          <Text size={200}>{captionFor(lookup)}</Text>
        </div>
        <div className={styles.scroll}>
          <div className={mergeClasses(styles.grid, styles.head)} aria-hidden="true">
            <span>Name</span>
            <span>Modified</span>
            <span>Id</span>
          </div>
          {error ? (
            <Text size={200} className={styles.empty}>
              {error}
            </Text>
          ) : results.length === 0 && !loading ? (
            <Text size={200} className={styles.empty}>
              {query ? 'No records match your search.' : 'No records found.'}
            </Text>
          ) : (
            <ul role="listbox" id={`${id}-results`} className={styles.list}>
              {results.map((row, index) => (
                <li
                  key={row.id}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={index === focusedIndex}
                  className={mergeClasses(styles.grid, styles.row, index === focusedIndex && styles.rowFocused)}
                  onClick={() => void lookup.select(row)}
                  onMouseEnter={() => lookup.focusRow(index)}
                >
                  <span className={mergeClasses(styles.cell, styles.primary)}>
                    {row.name ? highlightSegments(row.name, query, styles.mark) : 'Unnamed record'}
                  </span>
                  <span className={styles.cell}>{formatDate(row.modifiedOn)}</span>
                  <span className={mergeClasses(styles.cell, styles.mono)} title={row.id}>
                    {row.id}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Portal>
  )
}
