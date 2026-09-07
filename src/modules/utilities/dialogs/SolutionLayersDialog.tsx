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
import { type SolutionLayer, type SolutionLayers } from '@/shared/types'

const useStyles = makeStyles({
  surface: {
    maxWidth: '720px',
  },
  caption: {
    color: tokens.colorNeutralForeground3,
  },
})

const columns: DataTableColumn<SolutionLayer>[] = [
  { id: 'order', label: '#', width: 50, render: (layer) => String(layer.order), sortValue: (layer) => layer.order },
  {
    id: 'solution',
    label: 'Solution',
    width: 230,
    render: (layer) => layer.solutionName,
    sortValue: (layer) => layer.solutionName,
  },
  {
    id: 'kind',
    label: 'Layer',
    width: 120,
    render: (layer) => (
      <Badge appearance="tint" size="small" color={layer.isManaged ? 'informative' : 'warning'}>
        {layer.isManaged ? 'Managed' : 'Unmanaged'}
      </Badge>
    ),
    sortValue: (layer) => (layer.isManaged ? 1 : 0),
  },
  {
    id: 'publisher',
    label: 'Publisher',
    width: 180,
    render: (layer) => layer.publisherName ?? '—',
    sortValue: (layer) => layer.publisherName,
  },
  {
    id: 'version',
    label: 'Version',
    width: 110,
    render: (layer) => layer.version ?? '—',
    sortValue: (layer) => layer.version,
  },
]

const asText = (layers: SolutionLayers): string =>
  layers.layers
    .map(
      (layer) =>
        `${layer.order}. ${layer.solutionName} (${layer.isManaged ? 'managed' : 'unmanaged'})` +
        `${layer.publisherName ? ` — ${layer.publisherName}` : ''}${layer.version ? ` v${layer.version}` : ''}`,
    )
    .join('\n')

interface SolutionLayersDialogProps {
  layers: SolutionLayers | null
  onClose: () => void
}

export const SolutionLayersDialog = ({ layers, onClose }: SolutionLayersDialogProps) => {
  const styles = useStyles()
  return (
    <Dialog open={!!layers} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Solution Layers</DialogTitle>
          <DialogContent>
            {layers ? (
              <FormStack>
                <Text size={200} className={styles.caption}>
                  {`${layers.solutionComponentName}${layers.componentName ? ` · ${layers.componentName}` : ''} · the top layer wins at runtime`}
                </Text>
                {layers.unavailable ? <EmptyState intent="error" title={layers.unavailable} /> : null}
                {layers.hasUnmanagedLayer ? (
                  <EmptyState intent="warning" title="This component has an unmanaged layer.">
                    Unmanaged customisations sit above every managed solution, so imports of those solutions will not
                    change what users see until the unmanaged layer is removed.
                  </EmptyState>
                ) : null}
                <DataTable
                  items={layers.layers}
                  columns={columns}
                  getRowId={(layer) => `${layer.order}:${layer.solutionName}`}
                  maxHeight="280px"
                  emptyMessage="No layer information was returned for this component"
                />
              </FormStack>
            ) : null}
          </DialogContent>
          <DialogActions>
            <CopyButton text={layers ? asText(layers) : null} label="Copy" successMessage="Solution layers copied" />
            <Button appearance="primary" onClick={onClose}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
