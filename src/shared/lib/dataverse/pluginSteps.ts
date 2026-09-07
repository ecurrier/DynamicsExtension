import {
  type PluginStep,
  type PluginStepFailure,
  type PluginStepStateChange,
  type PluginStepStateResult,
} from '@/shared/types'

import { isNotFoundError } from './errors'
import { requireGuid } from './guards'
import { type DataverseHttp } from './http'
import { getAllPages } from './paging'
import { chunk } from '../chunk'
import { normalizeGuid } from '../guid'

const STEP_SELECT = [
  'sdkmessageprocessingstepid',
  'name',
  'stage',
  'mode',
  'rank',
  'statecode',
  'statuscode',
  'ismanaged',
  'filteringattributes',
  'description',
  'asyncautodelete',
  '_sdkmessageid_value',
  '_plugintypeid_value',
  '_sdkmessagefilterid_value',
].join(',')

const STEP_EXPAND = [
  'plugintypeid($select=plugintypeid,typename,friendlyname,name,_pluginassemblyid_value)',
  'sdkmessageid($select=name)',
  'sdkmessagefilterid($select=primaryobjecttypecode)',
].join(',')

const STEPS_PATH = `sdkmessageprocessingsteps?$select=${STEP_SELECT}&$expand=${STEP_EXPAND}&$filter=ishidden/Value eq false&$orderby=name asc`
const ASSEMBLY_SELECT = '$select=pluginassemblyid,name,version'
const PATCH_CONCURRENCY = 4

interface AssemblyRecord {
  pluginassemblyid: string
  name?: string | null
  version?: string | null
}

interface PluginTypeRecord {
  plugintypeid?: string | null
  typename?: string | null
  friendlyname?: string | null
  name?: string | null
  _pluginassemblyid_value?: string | null
}

interface StepRecord {
  sdkmessageprocessingstepid: string
  name?: string | null
  stage?: number | null
  mode?: number | null
  rank?: number | null
  statecode?: number | null
  statuscode?: number | null
  ismanaged?: boolean | null
  filteringattributes?: string | null
  description?: string | null
  asyncautodelete?: boolean | null
  plugintypeid?: PluginTypeRecord | null
  sdkmessageid?: { name?: string | null } | null
  sdkmessagefilterid?: { primaryobjecttypecode?: string | null } | null
}

const guidOrNull = (value: string | null | undefined): string | null => (value ? normalizeGuid(value) : null)

const describe = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason))

const indexAssemblies = (records: AssemblyRecord[]): Map<string, AssemblyRecord> =>
  new Map(records.map((record) => [normalizeGuid(record.pluginassemblyid), record]))

const toStep = (record: StepRecord, assemblies: Map<string, AssemblyRecord>): PluginStep => {
  const type = record.plugintypeid ?? null
  const assemblyId = guidOrNull(type?._pluginassemblyid_value)
  const assembly = assemblyId ? assemblies.get(assemblyId) : undefined
  return {
    id: normalizeGuid(record.sdkmessageprocessingstepid),
    name: record.name ?? '',
    stage: record.stage ?? 0,
    mode: record.mode ?? 0,
    rank: record.rank ?? 0,
    enabled: record.statecode === 0,
    isManaged: record.ismanaged === true,
    filteringAttributes: record.filteringattributes ?? null,
    description: record.description ?? null,
    asyncAutoDelete: record.asyncautodelete === true,
    messageName: record.sdkmessageid?.name ?? '',
    primaryEntity: record.sdkmessagefilterid?.primaryobjecttypecode ?? null,
    pluginTypeId: guidOrNull(type?.plugintypeid),
    pluginTypeName: type?.typename ?? type?.name ?? 'Unknown type',
    pluginTypeFriendlyName: type?.friendlyname ?? null,
    assemblyId,
    assemblyName: assembly?.name ?? 'Unknown assembly',
    assemblyVersion: assembly?.version ?? null,
  }
}

export interface PluginStepOperations {
  getSteps: () => Promise<PluginStep[]>
  get: (request: { id: string }) => Promise<PluginStep | null>
  setState: (change: PluginStepStateChange) => Promise<PluginStepStateResult>
}

export const pluginStepOperations = (http: DataverseHttp): PluginStepOperations => ({
  getSteps: async () => {
    const [steps, assemblies] = await Promise.all([
      getAllPages<StepRecord>(http, STEPS_PATH),
      getAllPages<AssemblyRecord>(http, `pluginassemblies?${ASSEMBLY_SELECT}`),
    ])
    const index = indexAssemblies(assemblies.rows)
    return steps.rows.map((record) => toStep(record, index))
  },
  get: async ({ id }) => {
    const stepId = requireGuid(id, 'Step')
    let record: StepRecord | undefined
    try {
      record = await http.get<StepRecord | undefined>(
        `sdkmessageprocessingsteps(${stepId})?$select=${STEP_SELECT}&$expand=${STEP_EXPAND}`,
      )
    } catch (error) {
      if (isNotFoundError(error)) {
        return null
      }
      throw error
    }
    if (!record) {
      return null
    }
    const assemblies = new Map<string, AssemblyRecord>()
    const assemblyId = guidOrNull(record.plugintypeid?._pluginassemblyid_value)
    if (assemblyId) {
      const assembly = await http
        .get<AssemblyRecord | undefined>(`pluginassemblies(${assemblyId})?${ASSEMBLY_SELECT}`)
        .catch(() => undefined)
      if (assembly) {
        assemblies.set(assemblyId, assembly)
      }
    }
    return toStep(record, assemblies)
  },
  setState: async ({ ids, enabled }) => {
    const stepIds = ids.map((id) => requireGuid(id, 'Step'))
    const body = enabled ? { statecode: 0, statuscode: 1 } : { statecode: 1, statuscode: 2 }
    const failed: PluginStepFailure[] = []
    for (const group of chunk(stepIds, PATCH_CONCURRENCY)) {
      const results = await Promise.allSettled(group.map((id) => http.patch(`sdkmessageprocessingsteps(${id})`, body)))
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failed.push({ id: group[index] as string, message: describe(result.reason) })
        }
      })
    }
    return { updated: stepIds.length - failed.length, failed }
  },
})
