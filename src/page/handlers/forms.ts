import { defineHandlers, PageError } from '@/messaging/page'
import { getFormContext, getXrm, retrieveMultipleOData } from '@/page/xrm'
import { buildPublishXml, formTypeFilter, formTypeLabel, isGuid, normalizeGuid } from '@/shared/lib'
import { type SystemForm } from '@/shared/types'

interface SystemFormRecord {
  formid: string
  name: string
  type: number
  ismanaged: boolean
  formactivationstate: number
  iscustomizable?: { Value?: boolean } | null
}

const FORM_ACTIVATION_ACTIVE = 1

const toSystemForm = (record: SystemFormRecord): SystemForm => ({
  id: normalizeGuid(record.formid),
  name: record.name,
  type: record.type,
  typeLabel: formTypeLabel(record.type),
  isManaged: record.ismanaged,
  isCustomizable: record.iscustomizable?.Value ?? true,
  isActive: record.formactivationstate === FORM_ACTIVATION_ACTIVE,
})

const requireFormId = (formId: string): string => {
  if (!isGuid(formId)) {
    throw new PageError('InvalidArgument', 'Form id is not a valid identifier')
  }
  return normalizeGuid(formId)
}

const publishEntity = (entityLogicalName: string) =>
  getXrm().WebApi.online.execute({
    ParameterXml: buildPublishXml(entityLogicalName),
    getMetadata: () => ({
      boundParameter: null,
      parameterTypes: { ParameterXml: { typeName: 'Edm.String', structuralProperty: 1 } },
      operationType: 0,
      operationName: 'PublishXml',
    }),
  })

export const formsHandlers = defineHandlers({
  'forms.getForms': async (): Promise<SystemForm[]> => {
    const entityName = getFormContext().data.entity.getEntityName()
    const query = `?$select=formid,name,type,ismanaged,formactivationstate,iscustomizable&$filter=objecttypecode eq '${entityName}' and (${formTypeFilter()})&$orderby=type asc,name asc`
    const records = await retrieveMultipleOData<SystemFormRecord>('systemform', query)
    return records.map(toSystemForm)
  },
  'forms.getFormXml': async ({ formId }) => {
    const record = (await getXrm().WebApi.retrieveRecord('systemform', requireFormId(formId), '?$select=formxml')) as
      { formxml?: string | null } | undefined
    if (typeof record?.formxml !== 'string') {
      throw new PageError('NotFound', 'The form has no XML definition')
    }
    return record.formxml
  },
  'forms.updateFormXml': async ({ formId, formXml, publish }) => {
    const entityName = getFormContext().data.entity.getEntityName()
    await getXrm().WebApi.updateRecord('systemform', requireFormId(formId), { formxml: formXml })
    if (publish) {
      await publishEntity(entityName)
    }
  },
})
