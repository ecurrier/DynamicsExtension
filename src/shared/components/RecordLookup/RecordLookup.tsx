import { Badge, Button, Input, makeStyles, useId } from '@fluentui/react-components'
import { Dismiss16Regular, Search20Regular } from '@fluentui/react-icons'
import { useEffect, useRef, useState } from 'react'

import { type LookupSelection, type LookupTarget } from '@/shared/types'

import { RecordLookupPanel } from './RecordLookupPanel'
import { useAnchoredPanel } from './useAnchoredPanel'
import { type RecordLookupServices, useRecordSearch } from './useRecordSearch'

const useStyles = makeStyles({
  root: {
    width: '100%',
  },
  input: {
    width: '100%',
  },
  after: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
})

export interface RecordLookupProps extends RecordLookupServices {
  targets: LookupTarget[]
  value: LookupSelection | null
  disabled?: boolean
  placeholder?: string
  onChange: (value: LookupSelection | null) => void
}

export const RecordLookup = ({
  targets,
  value,
  disabled = false,
  placeholder = 'Search records...',
  onChange,
  search,
  getEntityInfo,
}: RecordLookupProps) => {
  const styles = useStyles()
  const id = useId('record-lookup')
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const lookup = useRecordSearch({ targets, value, onChange, search, getEntityInfo })
  const open = lookup.open && !disabled && targets.length > 0
  const panelStyle = useAnchoredPanel(anchor, open)
  const { closePanel } = lookup

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (anchor?.contains(target) || panelRef.current?.contains(target)) {
        return
      }
      closePanel()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, anchor, closePanel])

  const showClear = !disabled && (value !== null || lookup.searchText !== '')
  const selectedEntity =
    value && targets.length > 1
      ? (lookup.entityInfos[value.entityLogicalName]?.displayName ?? value.entityLogicalName)
      : null

  return (
    <div ref={setAnchor} className={styles.root}>
      <Input
        className={styles.input}
        value={lookup.searchText}
        placeholder={placeholder}
        disabled={disabled}
        contentBefore={<Search20Regular />}
        contentAfter={
          <span className={styles.after}>
            {selectedEntity ? (
              <Badge appearance="tint" size="small">
                {selectedEntity}
              </Badge>
            ) : null}
            {showClear ? (
              <Button
                appearance="transparent"
                size="small"
                icon={<Dismiss16Regular />}
                aria-label="Clear"
                onMouseDown={(event) => event.preventDefault()}
                onClick={lookup.clear}
              />
            ) : null}
          </span>
        }
        onChange={(_, data) => lookup.handleInputChange(data.value)}
        onFocus={lookup.openPanel}
        onClick={lookup.openPanel}
        onKeyDown={lookup.handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={open ? `${id}-results` : undefined}
        aria-activedescendant={open && lookup.focusedIndex >= 0 ? `${id}-option-${lookup.focusedIndex}` : undefined}
        autoComplete="off"
      />
      {open ? (
        <RecordLookupPanel id={id} lookup={lookup} targets={targets} style={panelStyle} panelRef={panelRef} />
      ) : null}
    </div>
  )
}
