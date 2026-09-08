import {
  Braces20Regular,
  Code20Regular,
  DatabaseSearch20Regular,
  DocumentCopy20Regular,
  Eye20Regular,
  Globe20Regular,
  Table20Regular,
  TextBulletListSquare20Regular,
} from '@fluentui/react-icons'
import { useState } from 'react'

import { usePageFetcher, usePageMutation } from '@/messaging/client'
import { useCodegenStore } from '@/modules/codegen/store'
import { useWebApiStore } from '@/modules/webapi/store'
import { TaskCard, TaskGrid } from '@/shared/components'
import { openUrl } from '@/shared/extension'
import { useAsyncAction } from '@/shared/hooks'
import { useNavigationStore } from '@/shared/stores'
import {
  type CodegenTable,
  type FormAttributeInfo,
  type NamedFetchXml,
  type TableMetadata,
  type TemplateKind,
} from '@/shared/types'

import {
  ColumnBrowserDialog,
  FetchXmlDialog,
  FindColumnDialog,
  RecordPayloadDialog,
  type RecordPayloadDialogSource,
  TableMetadataDialog,
} from '../../dialogs'

interface ColumnBrowserState {
  table: CodegenTable
  formAttributes: Set<string> | null
}

interface FindColumnState {
  attributes: FormAttributeInfo[]
  initialLogicalName: string | null
}

export const DeveloperArea = () => {
  const navigate = useNavigationStore((state) => state.navigate)
  const setFetchXml = useWebApiStore((state) => state.setFetchXml)
  const launchGenerator = useCodegenStore((state) => state.launch)
  const fetchPage = usePageFetcher()
  const [queries, setQueries] = useState<NamedFetchXml[] | null>(null)
  const [metadata, setMetadata] = useState<TableMetadata | null>(null)
  const [browser, setBrowser] = useState<ColumnBrowserState | null>(null)
  const [browserOpen, setBrowserOpen] = useState(false)
  const [finder, setFinder] = useState<FindColumnState | null>(null)
  const [finderOpen, setFinderOpen] = useState(false)
  const [payload, setPayload] = useState<RecordPayloadDialogSource | null>(null)
  const [payloadOpen, setPayloadOpen] = useState(false)

  const generateFetchXml = usePageMutation('utilities.generateFetchXml', { onSuccess: (result) => setQueries(result) })
  const webApiUrl = usePageMutation('utilities.getWebApiUrl', { onSuccess: (url) => openUrl(url) })
  const tableMetadata = useAsyncAction('Could not read the table metadata')
  const generator = useAsyncAction('Could not open the code generator')
  const columnBrowser = useAsyncAction('Could not read the table columns')
  const findColumn = useAsyncAction('Could not read the form')
  const recordPayload = useAsyncAction('Could not build the record payload')

  const retrieveRecords = (fetchXml: string) => {
    setFetchXml(fetchXml)
    setQueries(null)
    navigate('webapi.retrieve-records')
  }

  const loadTable = async () => {
    const target = await fetchPage('utilities.getPageTarget', undefined, { fresh: true })
    if (!target.entityLogicalName) {
      throw new Error('Open a record form or a view so the table can be identified')
    }
    const table = await fetchPage('codegen.getTableModel', { entityLogicalName: target.entityLogicalName })
    return { target, table }
  }

  const showTableMetadata = () =>
    tableMetadata.run(async () => {
      const { target } = await loadTable()
      setMetadata(
        await fetchPage(
          'investigate.getTableMetadata',
          { entityLogicalName: target.entityLogicalName ?? '' },
          { fresh: true },
        ),
      )
    })

  const openGenerator = (kind: TemplateKind) =>
    generator.run(async () => {
      const target = await fetchPage('utilities.getPageTarget', undefined, { fresh: true })
      launchGenerator(kind, target.entityLogicalName)
      navigate('codegen.generate')
    })

  const openColumnBrowser = () =>
    columnBrowser.run(async () => {
      const { target, table } = await loadTable()
      const attributes =
        target.kind === 'form'
          ? await fetchPage('utilities.getFormAttributes', undefined, { fresh: true }).catch(() => null)
          : null
      setBrowser({
        table,
        formAttributes: attributes ? new Set(attributes.map((attribute) => attribute.logicalName)) : null,
      })
      setBrowserOpen(true)
    })

  const openFindColumn = (initialLogicalName: string | null) =>
    findColumn.run(async () => {
      const attributes = await fetchPage('utilities.getFormAttributes', undefined, { fresh: true })
      setFinder({ attributes, initialLogicalName })
      setFinderOpen(true)
    })

  const openRecordPayload = () =>
    recordPayload.run(async () => {
      const [source, { table }] = await Promise.all([
        fetchPage('utilities.getRecordPayloadSource', undefined, { fresh: true }),
        loadTable(),
      ])
      setPayload({ values: source.values, table })
      setPayloadOpen(true)
    })

  return (
    <>
      <TaskGrid>
        <TaskCard
          title="Generate Query"
          description="Fetch XML for the current record, its subgrids, or the view as displayed. Plus Web API and JavaScript equivalents."
          icon={Code20Regular}
          loading={generateFetchXml.isPending}
          onAction={() => generateFetchXml.mutate(undefined)}
        />
        <TaskCard
          title="Record Payload"
          description="The open record as a Web API create or update body, with lookups bound and read-only columns left out."
          icon={DocumentCopy20Regular}
          actionLabel="Show"
          loading={recordPayload.running}
          onAction={() => void openRecordPayload()}
        />
        <TaskCard
          title="Table Metadata"
          description="Schema names, entity set, primary columns, alternate keys, and every relationship with its navigation property."
          icon={DatabaseSearch20Regular}
          actionLabel="Show"
          loading={tableMetadata.running}
          onAction={() => void showTableMetadata()}
        />
        <TaskCard
          title="Column Browser"
          description="Search the current table's columns by display, logical, or schema name, and copy the one you need."
          icon={Table20Regular}
          actionLabel="Browse"
          loading={columnBrowser.running}
          onAction={() => void openColumnBrowser()}
        />
        <TaskCard
          title="Open Web API URL"
          description="Open the current environment's Web API root in a new tab."
          icon={Globe20Regular}
          actionLabel="Open"
          loading={webApiUrl.isPending}
          onAction={() => webApiUrl.mutate(undefined)}
        />
        <TaskCard
          title="Find Column on Form"
          description="Locate a column on the open form, see its tab, section, and state, and reveal it when it is hidden."
          icon={Eye20Regular}
          actionLabel="Find"
          loading={findColumn.running}
          onAction={() => void openFindColumn(null)}
        />
        <TaskCard
          title="Generate Choice Code Snippet"
          description="Enums or objects for this table's choices and the global ones, from your default choice Template."
          icon={TextBulletListSquare20Regular}
          loading={generator.running}
          onAction={() => void openGenerator('choice')}
        />
        <TaskCard
          title="Generate Table Class"
          description="A class or interface for the current table's columns, from your default table Template."
          icon={Braces20Regular}
          loading={generator.running}
          onAction={() => void openGenerator('table')}
        />
      </TaskGrid>
      <FetchXmlDialog queries={queries} onClose={() => setQueries(null)} onRetrieveRecords={retrieveRecords} />
      <TableMetadataDialog metadata={metadata} onClose={() => setMetadata(null)} />
      <ColumnBrowserDialog
        open={browserOpen}
        table={browser?.table ?? null}
        formAttributes={browser?.formAttributes ?? null}
        onClose={() => setBrowserOpen(false)}
        onFindOnForm={(logicalName) => {
          setBrowserOpen(false)
          void openFindColumn(logicalName)
        }}
      />
      <FindColumnDialog
        open={finderOpen}
        attributes={finder?.attributes ?? []}
        initialLogicalName={finder?.initialLogicalName ?? null}
        onClose={() => setFinderOpen(false)}
      />
      <RecordPayloadDialog open={payloadOpen} source={payload} onClose={() => setPayloadOpen(false)} />
    </>
  )
}
