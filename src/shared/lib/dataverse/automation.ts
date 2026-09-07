import {
  type AutomationItem,
  type AutomationKind,
  type AutomationRun,
  type TableAutomation,
  type TriggerRegistration,
} from '@/shared/types'

import { requireLogicalName } from './guards'
import { type DataverseHttp } from './http'
import { getAllPages } from './paging'
import { isGuid, normalizeGuid } from '../guid'
import { odataStringLiteral } from '../odata'

const WORKFLOW_SELECT = [
  'workflowid',
  'name',
  'category',
  'type',
  'statecode',
  'mode',
  'rank',
  'primaryentity',
  'triggeroncreate',
  'triggerondelete',
  'triggeronupdateattributelist',
  'ondemand',
  'ismanaged',
  'description',
].join(',')

const STEP_SELECT = [
  'sdkmessageprocessingstepid',
  'name',
  'stage',
  'mode',
  'rank',
  'statecode',
  'ismanaged',
  'filteringattributes',
  'description',
  '_plugintypeid_value',
].join(',')

const STEP_EXPAND = [
  'plugintypeid($select=typename,friendlyname,name)',
  'sdkmessageid($select=name)',
  'sdkmessagefilterid($select=primaryobjecttypecode)',
].join(',')

const RUN_SELECT = [
  'asyncoperationid',
  'name',
  'statecode',
  'statuscode',
  'message',
  'startedon',
  'completedon',
  'operationtype',
].join(',')

const REGISTRATION_SELECT = ['callbackregistrationid', 'name', 'entityname', 'message', 'filteringattributes'].join(',')

const MAX_RUNS = 25

const CATEGORY_KINDS: Record<number, AutomationKind> = {
  0: 'workflow',
  1: 'other',
  2: 'businessrule',
  3: 'action',
  4: 'bpf',
  5: 'flow',
  6: 'flow',
  7: 'flow',
}

const STAGE_LABELS: Record<number, string> = {
  10: 'Pre-validation',
  20: 'Pre-operation',
  40: 'Post-operation',
}

const RUN_STATUS_LABELS: Record<number, string> = {
  0: 'Waiting for resources',
  10: 'Waiting',
  20: 'In progress',
  21: 'Pausing',
  22: 'Canceling',
  30: 'Succeeded',
  31: 'Failed',
  32: 'Canceled',
}

interface WorkflowRecord {
  workflowid: string
  name?: string | null
  category?: number | null
  type?: number | null
  statecode?: number | null
  mode?: number | null
  rank?: number | null
  triggeroncreate?: boolean | null
  triggerondelete?: boolean | null
  triggeronupdateattributelist?: string | null
  ondemand?: boolean | null
  ismanaged?: boolean | null
  description?: string | null
}

interface StepRecord {
  sdkmessageprocessingstepid: string
  name?: string | null
  stage?: number | null
  mode?: number | null
  rank?: number | null
  statecode?: number | null
  ismanaged?: boolean | null
  filteringattributes?: string | null
  description?: string | null
  plugintypeid?: { typename?: string | null; friendlyname?: string | null; name?: string | null } | null
  sdkmessageid?: { name?: string | null } | null
}

interface RunRecord {
  asyncoperationid: string
  name?: string | null
  statecode?: number | null
  statuscode?: number | null
  message?: string | null
  startedon?: string | null
  completedon?: string | null
}

interface RegistrationRecord {
  callbackregistrationid: string
  name?: string | null
  entityname?: string | null
  message?: string | null
  filteringattributes?: string | null
}

const splitAttributes = (value: string | null | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

const describe = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason))

const meaningfulName = (value: string | null | undefined): string | null => {
  const name = value?.trim()
  return name && !isGuid(name) ? name : null
}

const workflowMessages = (record: WorkflowRecord): string[] => {
  const messages: string[] = []
  if (record.triggeroncreate) {
    messages.push('Create')
  }
  if (record.triggeronupdateattributelist !== null && record.triggeronupdateattributelist !== undefined) {
    messages.push('Update')
  }
  if (record.triggerondelete) {
    messages.push('Delete')
  }
  if (record.ondemand) {
    messages.push('On demand')
  }
  return messages
}

const toWorkflowItem = (record: WorkflowRecord): AutomationItem => {
  const category = record.category ?? 0
  return {
    id: normalizeGuid(record.workflowid),
    name: record.name ?? '',
    kind: CATEGORY_KINDS[category] ?? 'other',
    messages: workflowMessages(record),
    stage: null,
    stageLabel: null,
    mode: category === 5 ? null : record.mode === 1 ? 'sync' : 'async',
    rank: record.rank ?? null,
    enabled: record.statecode === 1,
    isManaged: record.ismanaged === true,
    filteringAttributes: splitAttributes(record.triggeronupdateattributelist),
    owner: null,
    description: record.description ?? null,
  }
}

const toStepItem = (record: StepRecord): AutomationItem => {
  const type = record.plugintypeid
  return {
    id: normalizeGuid(record.sdkmessageprocessingstepid),
    name: record.name ?? '',
    kind: 'plugin',
    messages: record.sdkmessageid?.name ? [record.sdkmessageid.name] : [],
    stage: record.stage ?? null,
    stageLabel: STAGE_LABELS[record.stage ?? -1] ?? null,
    mode: record.mode === 1 ? 'async' : 'sync',
    rank: record.rank ?? null,
    enabled: record.statecode === 0,
    isManaged: record.ismanaged === true,
    filteringAttributes: splitAttributes(record.filteringattributes),
    owner: meaningfulName(type?.typename) ?? meaningfulName(type?.name) ?? meaningfulName(type?.friendlyname),
    description: record.description ?? null,
  }
}

const toRun = (record: RunRecord): AutomationRun => ({
  id: normalizeGuid(record.asyncoperationid),
  name: record.name ?? '',
  statusLabel: RUN_STATUS_LABELS[record.statuscode ?? -1] ?? `Status ${record.statuscode ?? '?'}`,
  failed: record.statuscode === 31 || record.statuscode === 32,
  message: record.message ?? null,
  startedOn: record.startedon ?? null,
  completedOn: record.completedon ?? null,
})

const compareItems = (left: AutomationItem, right: AutomationItem): number => {
  const stage = (left.stage ?? 100) - (right.stage ?? 100)
  if (stage !== 0) {
    return stage
  }
  const rank = (left.rank ?? 0) - (right.rank ?? 0)
  if (rank !== 0) {
    return rank
  }
  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
}

export interface AutomationOperations {
  getTableAutomation: (request: { entityLogicalName: string }) => Promise<TableAutomation>
}

export const automationOperations = (http: DataverseHttp): AutomationOperations => ({
  getTableAutomation: async ({ entityLogicalName }) => {
    const table = requireLogicalName(entityLogicalName, 'Table')
    const literal = odataStringLiteral(table)

    const workflowsPromise = getAllPages<WorkflowRecord>(
      http,
      `workflows?$select=${WORKFLOW_SELECT}&$filter=primaryentity eq ${literal} and type eq 1&$orderby=name asc`,
    )
    const stepsPromise = getAllPages<StepRecord>(
      http,
      `sdkmessageprocessingsteps?$select=${STEP_SELECT}&$expand=${STEP_EXPAND}` +
        `&$filter=ishidden/Value eq false and sdkmessagefilterid/primaryobjecttypecode eq ${literal}` +
        `&$orderby=name asc`,
    )
    const registrationsPromise = getAllPages<RegistrationRecord>(
      http,
      `callbackregistrations?$select=${REGISTRATION_SELECT}&$filter=entityname eq ${literal}`,
    ).then(
      (result) => ({ rows: result.rows, error: null as string | null }),
      (reason: unknown) => ({ rows: [] as RegistrationRecord[], error: describe(reason) }),
    )
    const runsPromise = http
      .get<{ value?: RunRecord[] }>(
        `asyncoperations?$select=${RUN_SELECT}&$filter=primaryentitytype eq ${literal}` +
          `&$orderby=createdon desc&$top=${MAX_RUNS}`,
      )
      .then(
        (response) => ({ rows: response?.value ?? [], error: null as string | null }),
        (reason: unknown) => ({ rows: [] as RunRecord[], error: describe(reason) }),
      )

    const [workflows, steps, registrations, runs] = await Promise.all([
      workflowsPromise,
      stepsPromise,
      registrationsPromise,
      runsPromise,
    ])

    const items = [...steps.rows.map(toStepItem), ...workflows.rows.map(toWorkflowItem)].sort(compareItems)

    return {
      entityLogicalName: table,
      items,
      registrations: registrations.rows.map<TriggerRegistration>((record) => ({
        id: normalizeGuid(record.callbackregistrationid),
        name: record.name ?? null,
        entityName: record.entityname ?? null,
        message: record.message ?? null,
        filteringAttributes: record.filteringattributes ?? null,
      })),
      registrationsUnavailable: registrations.error,
      recentRuns: runs.rows.map(toRun),
      runsUnavailable: runs.error,
    }
  },
})
