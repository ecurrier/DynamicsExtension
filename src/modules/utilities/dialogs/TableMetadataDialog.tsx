import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  makeStyles,
  Text,
  tokens,
} from '@fluentui/react-components'
import { Search20Regular } from '@fluentui/react-icons'
import { Fragment, useMemo, useState } from 'react'

import { CopyButton, DataTable, type DataTableColumn, FormStack } from '@/shared/components'
import { type TableKey, type TableMetadata, type TableRelationship } from '@/shared/types'

import { metadataFacts, metadataToText, relationshipMatches } from '../lib'

const useStyles = makeStyles({
  surface: {
    maxWidth: '760px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'max-content minmax(0, 1fr) max-content minmax(0, 1fr)',
    columnGap: '16px',
    rowGap: '8px',
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
  caption: {
    color: tokens.colorNeutralForeground3,
  },
})

interface TableMetadataDialogProps {
  metadata: TableMetadata | null
  onClose: () => void
}

export const TableMetadataDialog = ({ metadata, onClose }: TableMetadataDialogProps) => {
  const styles = useStyles()
  const [filter, setFilter] = useState('')

  const facts = metadata ? metadataFacts(metadata) : []
  const relationships = useMemo(
    () => (metadata?.relationships ?? []).filter((relationship) => relationshipMatches(relationship, filter)),
    [metadata, filter],
  )

  const relationshipColumns = useMemo<DataTableColumn<TableRelationship>[]>(
    () => [
      {
        id: 'kind',
        label: 'Kind',
        width: 70,
        render: (row) => (
          <Badge appearance="tint" size="small">
            {row.kind}
          </Badge>
        ),
        sortValue: (row) => row.kind,
      },
      {
        id: 'related',
        label: 'Related table',
        width: 160,
        render: (row) => <span className={styles.value}>{row.relatedEntity}</span>,
        sortValue: (row) => row.relatedEntity,
      },
      {
        id: 'nav',
        label: 'Navigation property',
        width: 220,
        render: (row) => <span className={styles.value}>{row.navigationProperty ?? '—'}</span>,
        sortValue: (row) => row.navigationProperty,
      },
      {
        id: 'extra',
        label: 'Column / intersect',
        width: 200,
        render: (row) => <span className={styles.value}>{row.intersectEntity ?? row.referencingAttribute ?? '—'}</span>,
        sortValue: (row) => row.intersectEntity ?? row.referencingAttribute,
      },
      {
        id: 'schema',
        label: 'Schema name',
        width: 240,
        render: (row) => <span className={styles.value}>{row.schemaName}</span>,
        sortValue: (row) => row.schemaName,
      },
    ],
    [styles],
  )

  const keyColumns = useMemo<DataTableColumn<TableKey>[]>(
    () => [
      {
        id: 'name',
        label: 'Key',
        width: 220,
        render: (row) => row.displayName ?? row.logicalName,
        sortValue: (row) => row.displayName ?? row.logicalName,
      },
      {
        id: 'columns',
        label: 'Columns',
        width: 280,
        render: (row) => <span className={styles.value}>{row.attributes.join(', ')}</span>,
        sortValue: (row) => row.attributes.join(','),
      },
      {
        id: 'status',
        label: 'Index',
        width: 110,
        render: (row) => (
          <Badge appearance="tint" size="small" color={row.statusLabel === 'Active' ? 'success' : 'warning'}>
            {row.statusLabel}
          </Badge>
        ),
        sortValue: (row) => row.statusLabel,
      },
    ],
    [styles],
  )

  return (
    <Dialog open={!!metadata} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>{metadata ? `${metadata.displayName} (${metadata.logicalName})` : 'Table Metadata'}</DialogTitle>
          <DialogContent>
            {metadata ? (
              <FormStack>
                <div className={styles.grid}>
                  {facts.map((fact) => (
                    <Fragment key={fact.label}>
                      <Text size={200} className={styles.label}>
                        {fact.label}
                      </Text>
                      <Text size={200} className={styles.value}>
                        {fact.value}
                      </Text>
                    </Fragment>
                  ))}
                </div>
                <Accordion collapsible multiple defaultOpenItems={['keys']}>
                  <AccordionItem value="keys">
                    <AccordionHeader>{`Alternate keys (${metadata.keys.length})`}</AccordionHeader>
                    <AccordionPanel>
                      <DataTable
                        items={metadata.keys}
                        columns={keyColumns}
                        getRowId={(row) => row.logicalName}
                        maxHeight="160px"
                        emptyMessage="No alternate keys are defined on this table"
                      />
                    </AccordionPanel>
                  </AccordionItem>
                  <AccordionItem value="relationships">
                    <AccordionHeader>{`Relationships (${metadata.relationships.length})`}</AccordionHeader>
                    <AccordionPanel>
                      <FormStack>
                        <Input
                          contentBefore={<Search20Regular />}
                          placeholder="Filter relationships..."
                          value={filter}
                          onChange={(_, data) => setFilter(data.value)}
                        />
                        <DataTable
                          items={relationships}
                          columns={relationshipColumns}
                          getRowId={(row) => `${row.kind}:${row.schemaName}`}
                          maxHeight="240px"
                          pageSize={50}
                          emptyMessage="No relationships match the filter"
                        />
                        <Text size={200} className={styles.caption}>
                          {`${relationships.length} of ${metadata.relationships.length} relationships`}
                        </Text>
                      </FormStack>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </FormStack>
            ) : null}
          </DialogContent>
          <DialogActions>
            <CopyButton
              text={metadata ? metadataToText(metadata) : null}
              label="Copy"
              successMessage="Table metadata copied"
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
