import { defineHandlers, PageError } from '@/messaging/page'
import { getFormContext, getXrm, retrieveMultipleOData } from '@/page/xrm'
import { buildPublishXml, formTypeFilter, formTypeLabel, isGuid, normalizeGuid, parseFormEvents } from '@/shared/lib'
import {
  type FormBusinessRule,
  type FormControlDiagnostic,
  type FormDiagnostics,
  type SystemForm,
} from '@/shared/types'

interface SystemFormRecord {
  formid: string
  name: string
  type: number
  ismanaged: boolean
  formactivationstate: number
  iscustomizable?: { Value?: boolean } | null
}

interface BusinessRuleRecord {
  workflowid: string
  name?: string | null
  statecode?: number | null
  scope?: number | null
}

const FORM_ACTIVATION_ACTIVE = 1

const SCOPE_LABELS: Record<number, string> = {
  1: 'User',
  2: 'Business unit',
  3: 'Parent: child business units',
  4: 'Organization',
}

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

const readFormXml = async (formId: string): Promise<string> => {
  const record = (await getXrm().WebApi.retrieveRecord('systemform', formId, '?$select=formxml')) as
    { formxml?: string | null } | undefined
  if (typeof record?.formxml !== 'string') {
    throw new PageError('NotFound', 'The form has no XML definition')
  }
  return record.formxml
}

const describe = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason))

const collectControls = (formContext: Xrm.Page): FormControlDiagnostic[] => {
  const diagnostics: FormControlDiagnostic[] = []
  formContext.ui.tabs.forEach((tab) => {
    const tabLabel = tab.getLabel?.() ?? tab.getName()
    tab.sections.forEach((section) => {
      const sectionLabel = section.getLabel?.() ?? section.getName()
      section.controls.forEach((control) => {
        const candidate = control as Partial<Xrm.Controls.StandardControl>
        const attribute = candidate.getAttribute?.()
        diagnostics.push({
          name: control.getName(),
          label: candidate.getLabel?.() ?? control.getName(),
          controlType: control.getControlType(),
          tab: tabLabel,
          section: sectionLabel,
          visible: candidate.getVisible?.() ?? true,
          disabled: candidate.getDisabled?.() ?? false,
          requiredLevel: attribute?.getRequiredLevel?.() ?? 'none',
          hasValue: attribute?.getValue?.() !== null && attribute?.getValue?.() !== undefined,
        })
      })
    })
  })
  return diagnostics
}

export const formsHandlers = defineHandlers({
  'forms.getForms': async (): Promise<SystemForm[]> => {
    const entityName = getFormContext().data.entity.getEntityName()
    const query = `?$select=formid,name,type,ismanaged,formactivationstate,iscustomizable&$filter=objecttypecode eq '${entityName}' and (${formTypeFilter()})&$orderby=type asc,name asc`
    const records = await retrieveMultipleOData<SystemFormRecord>('systemform', query)
    return records.map(toSystemForm)
  },
  'forms.getFormXml': ({ formId }) => readFormXml(requireFormId(formId)),
  'forms.updateFormXml': async ({ formId, formXml, publish }) => {
    const entityName = getFormContext().data.entity.getEntityName()
    await getXrm().WebApi.updateRecord('systemform', requireFormId(formId), { formxml: formXml })
    if (publish) {
      await publishEntity(entityName)
    }
  },
  'forms.getFormDiagnostics': async (): Promise<FormDiagnostics> => {
    const formContext = getFormContext()
    const entityLogicalName = formContext.data.entity.getEntityName()
    const currentForm = formContext.ui.formSelector.getCurrentItem()
    const formId = normalizeGuid(currentForm.getId())

    let libraries: FormDiagnostics['libraries'] = []
    let handlers: FormDiagnostics['handlers'] = []
    let formXmlUnavailable: string | null = null
    try {
      const parsed = parseFormEvents(await readFormXml(formId))
      libraries = parsed.libraries
      handlers = parsed.handlers
    } catch (error) {
      formXmlUnavailable = describe(error)
    }

    let businessRules: FormBusinessRule[] = []
    let businessRulesUnavailable: string | null = null
    try {
      const records = await retrieveMultipleOData<BusinessRuleRecord>(
        'workflow',
        `?$select=workflowid,name,statecode,scope&$filter=category eq 2 and type eq 1 and primaryentity eq '${entityLogicalName}'&$orderby=name asc`,
      )
      businessRules = records.map((record) => ({
        id: normalizeGuid(record.workflowid),
        name: record.name ?? '',
        enabled: record.statecode === 1,
        scopeLabel: SCOPE_LABELS[record.scope ?? -1] ?? 'Unknown scope',
      }))
    } catch (error) {
      businessRulesUnavailable = describe(error)
    }

    return {
      formId,
      formName: currentForm.getLabel(),
      entityLogicalName,
      libraries,
      handlers,
      controls: collectControls(formContext),
      businessRules,
      businessRulesUnavailable,
      formXmlUnavailable,
    }
  },
})
