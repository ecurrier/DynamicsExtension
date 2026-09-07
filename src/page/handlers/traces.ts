import { defineHandlers, PageError } from '@/messaging/page'
import { getXrm, pageHttp } from '@/page/xrm'
import { buildTraceQuery, isGuid, mapTraceLog, normalizeGuid, type PluginTraceLogRecord } from '@/shared/lib'
import { type PluginTraceLog, type TraceDeleteResult, type TraceLogSetting } from '@/shared/types'

interface OrganizationRecord {
  organizationid: string
  plugintracelogsetting: number
}

const DELETE_CONCURRENCY = 5

const readOrganization = async (): Promise<OrganizationRecord> => {
  const response = await pageHttp().get<{ value?: OrganizationRecord[] }>(
    'organizations?$select=organizationid,plugintracelogsetting',
  )
  const record = response.value?.[0]
  if (!record) {
    throw new PageError('NotFound', 'The organization record could not be read')
  }
  return record
}

const isTraceLogSetting = (value: number): value is TraceLogSetting => value === 0 || value === 1 || value === 2

export const tracesHandlers = defineHandlers({
  'traces.query': async (query): Promise<PluginTraceLog[]> => {
    getXrm()
    const response = await pageHttp().get<{ value?: PluginTraceLogRecord[] }>(buildTraceQuery(query))
    return (response.value ?? []).map(mapTraceLog)
  },
  'traces.delete': async ({ ids }): Promise<TraceDeleteResult> => {
    getXrm()
    const valid = ids.filter(isGuid).map(normalizeGuid)
    let deleted = 0
    for (let index = 0; index < valid.length; index += DELETE_CONCURRENCY) {
      const chunk = valid.slice(index, index + DELETE_CONCURRENCY)
      await Promise.all(chunk.map((id) => pageHttp().delete(`plugintracelogs(${id})`)))
      deleted += chunk.length
    }
    return { deleted }
  },
  'traces.getSetting': async (): Promise<TraceLogSetting> => {
    getXrm()
    const record = await readOrganization()
    return isTraceLogSetting(record.plugintracelogsetting) ? record.plugintracelogsetting : 0
  },
  'traces.setSetting': async ({ value }) => {
    getXrm()
    const record = await readOrganization()
    await pageHttp().patch(`organizations(${normalizeGuid(record.organizationid)})`, { plugintracelogsetting: value })
  },
})
