import {
  Badge,
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

import { CopyButton, DataTable, type DataTableColumn, EmptyState, FormStack } from '@/shared/components'
import { type AdminModeResult } from '@/shared/types'

import { adminModeFindings, adminModeToText, type AdminModeFinding } from '../lib'

const useStyles = makeStyles({
  surface: {
    maxWidth: '680px',
  },
  caption: {
    color: tokens.colorNeutralForeground3,
  },
  mono: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
})

interface AdminModeDialogProps {
  result: AdminModeResult | null
  restoring: boolean
  onRestore: () => void
  onClose: () => void
}

export const AdminModeDialog = ({ result, restoring, onRestore, onClose }: AdminModeDialogProps) => {
  const styles = useStyles()
  const findings = result ? adminModeFindings(result) : []

  const columns: DataTableColumn<AdminModeFinding>[] = [
    {
      id: 'label',
      label: 'Control',
      width: 200,
      render: (finding) => <span title={finding.name}>{finding.label}</span>,
      sortValue: (finding) => finding.label,
    },
    {
      id: 'name',
      label: 'Logical name',
      width: 190,
      render: (finding) => <span className={styles.mono}>{finding.name}</span>,
      sortValue: (finding) => finding.name,
    },
    {
      id: 'state',
      label: 'Was',
      width: 200,
      render: (finding) => (
        <Badge appearance="tint" size="small" color={finding.severe ? 'danger' : 'warning'}>
          {finding.state}
        </Badge>
      ),
      sortValue: (finding) => finding.state,
    },
  ]

  return (
    <Dialog open={!!result} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Admin Mode</DialogTitle>
          <DialogContent>
            {result ? (
              <FormStack>
                <Text size={200} className={styles.caption}>
                  {`Every field, tab, and section is now visible, editable, and optional. ` +
                    `${findings.length} of ${result.total} controls were restricted before this ran.`}
                </Text>
                {findings.length === 0 ? (
                  <EmptyState intent="info" title="Nothing on this form was hidden, read-only, or required.">
                    Nothing on this form was hidden, read-only, or required.
                  </EmptyState>
                ) : (
                  <DataTable
                    items={findings}
                    columns={columns}
                    getRowId={(finding) => finding.name}
                    maxHeight="280px"
                  />
                )}
              </FormStack>
            ) : null}
          </DialogContent>
          <DialogActions>
            <CopyButton
              text={result ? adminModeToText(result) : null}
              label="Copy"
              successMessage="Findings copied to clipboard"
            />
            <Button appearance="secondary" disabled={restoring || !result} onClick={onRestore}>
              {restoring ? 'Restoring...' : 'Restore form'}
            </Button>
            <Button appearance="primary" onClick={onClose}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
