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

import { CopyButton } from '@/shared/components'
import { type EnvironmentDetails } from '@/shared/types'

import { formatEnvironmentDetails } from '../lib'

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    columnGap: '16px',
    rowGap: '6px',
    alignItems: 'baseline',
  },
  label: {
    color: tokens.colorNeutralForeground3,
  },
  value: {
    wordBreak: 'break-all',
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
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Environment Details</DialogTitle>
          <DialogContent>
            <div className={styles.grid}>
              {rows.map((row) => (
                <Text key={row.label} size={200} className={styles.label}>
                  {row.label}
                  <Text size={200} className={styles.value} style={{ display: 'contents' }}>
                    {row.value}
                  </Text>
                </Text>
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
