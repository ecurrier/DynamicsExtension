import { type EnvironmentDetails, type SessionSnapshot } from '@/shared/types'

import { formatEnvironmentDetails } from './environmentDetails'

export interface SnapshotSection {
  title: string
  rows: { label: string; value: string }[]
}

const text = (value: string | null | undefined): string =>
  value === null || value === undefined || value === '' ? '—' : value

const flag = (value: boolean | null): string => (value === null ? '—' : value ? 'On' : 'Off')

const list = (values: string[]): string => (values.length > 0 ? values.join(', ') : '—')

export const snapshotSections = (
  details: EnvironmentDetails | null,
  snapshot: SessionSnapshot | null,
): SnapshotSection[] => {
  const sections: SnapshotSection[] = []
  if (details) {
    sections.push({ title: 'Environment', rows: formatEnvironmentDetails(details) })
  }
  if (!snapshot) {
    return sections
  }
  sections.push({
    title: 'User',
    rows: [
      { label: 'Name', value: text(snapshot.user.name) },
      { label: 'User Id', value: text(snapshot.user.id) },
      { label: 'Business Unit', value: text(snapshot.user.businessUnitName) },
      { label: 'Security Roles', value: list(snapshot.user.roles) },
      { label: 'Teams', value: list(snapshot.user.teams) },
    ],
  })
  sections.push({
    title: 'Diagnostics',
    rows: [
      { label: 'Platform Version', value: text(snapshot.organization.version) },
      { label: 'Auditing', value: flag(snapshot.organization.isAuditEnabled) },
      { label: 'Plug-in Trace Log', value: text(snapshot.organization.pluginTraceLogSetting) },
      { label: 'Duplicate Detection', value: flag(snapshot.organization.isDuplicateDetectionEnabled) },
      {
        label: 'Background Processing',
        value:
          snapshot.organization.backgroundProcessingDisabled === null
            ? '—'
            : snapshot.organization.backgroundProcessingDisabled
              ? 'Disabled — asynchronous jobs will not run'
              : 'Enabled',
      },
    ],
  })
  sections.push({
    title: 'Session',
    rows: [
      { label: 'App', value: text(snapshot.app.name) },
      { label: 'App Unique Name', value: text(snapshot.app.uniqueName) },
      { label: 'App Id', value: text(snapshot.app.id) },
      { label: 'Page', value: text(snapshot.page.kind) },
      { label: 'Table', value: text(snapshot.page.entityLogicalName) },
      { label: 'Record Id', value: text(snapshot.page.recordId) },
      { label: 'Form', value: text(snapshot.page.formName) },
      { label: 'Form Id', value: text(snapshot.page.formId) },
      { label: 'Client', value: text(snapshot.client.client) },
      { label: 'Form Factor', value: text(snapshot.client.formFactor) },
      { label: 'Language Id', value: snapshot.client.languageId === null ? '—' : String(snapshot.client.languageId) },
    ],
  })
  return sections
}

export const snapshotToMarkdown = (sections: SnapshotSection[]): string =>
  sections
    .map(
      (section) =>
        `**${section.title}**\n\n` +
        `| Field | Value |\n| --- | --- |\n` +
        section.rows.map((row) => `| ${row.label} | ${row.value} |`).join('\n'),
    )
    .join('\n\n')
