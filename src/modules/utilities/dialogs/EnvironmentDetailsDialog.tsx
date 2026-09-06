import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  Text,
  tokens,
} from '@fluentui/react-components'
import { Fragment } from 'react'

import { CopyButton } from '@/shared/components'
import { type EnvironmentDetails } from '@/shared/types'

import { formatEnvironmentDetails } from '../lib'

const useStyles = makeStyles({
  surface: {
    maxWidth: '640px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'max-content minmax(0, 1fr)',
    columnGap: '20px',
    rowGap: '10px',
    alignItems: 'baseline',
  },
  label: {
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
  value: {
    minWidth: 0,
    overflowWrap: 'anywhere',
    fontFamily: tokens.fontFamilyMonospace,
  },
})

interface EnvironmentDetailsDialogProps {
  details: EnvironmentDetails | null
  onClose: () => void
}

export const EnvironmentDetailsDialog = ({ details, onClose }: EnvironmentDetailsDialogProps) => {
  const styles = useStyles()
  const rows = details ? formatEnvironmentDetails(details) : []
  return (
    <Dialog open={details !== null} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Environment Details</DialogTitle>
          <DialogContent>
            <div className={styles.grid}>
              {rows.map((row) => (
                <Fragment key={row.label}>
                  <Text size={200} className={styles.label}>
                    {row.label}
                  </Text>
                  <Text size={200} className={styles.value}>
                    {row.value}
                  </Text>
                </Fragment>
              ))}
            </div>
          </DialogContent>
          <DialogActions>
            <CopyButton
              text={rows.map((row) => `${row.label}: ${row.value}`).join('\n')}
              label="Copy all"
              successMessage="Environment details copied"
            />
            <Button appearance="primary" onClick={onClose}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
