import { defineHandlers, PageError } from '@/messaging/page'
import { getEntityId, getFormContext, getXrm } from '@/page/xrm'
import { type RecordPayloadSource } from '@/shared/types'

export const recordPayloadHandlers = defineHandlers({
  'utilities.getRecordPayloadSource': async (): Promise<RecordPayloadSource> => {
    const formContext = getFormContext()
    const recordId = getEntityId(formContext)
    if (!recordId) {
      throw new PageError('NotSupported', 'Save the record before building a payload for it')
    }
    const entityLogicalName = formContext.data.entity.getEntityName()
    const record = await getXrm().WebApi.retrieveRecord(entityLogicalName, recordId)
    return { entityLogicalName, recordId, values: (record ?? {}) as Record<string, unknown> }
  },
})
