import { defineHandlers, PageError } from '@/messaging/page'
import {
  type AttributeMetadataRecord,
  fetchAllOptionSetAttributes,
  fetchJson,
  getFormContext,
  getGlobalContext,
  getPageKind,
  getXrm,
  labelText,
  type OptionSetMetadata,
  retrieveMultipleOData,
  WEB_API_PATH,
  getEntityId,
} from '@/page/xrm'
import { getQueryParameter } from '@/shared/lib'
import {
  type ChoiceMetadata,
  type ChoiceOption,
  type ChoiceSet,
  type ControlDetails,
  type GeneratedUrl,
  type NamedFetchXml,
} from '@/shared/types'

const collapseWhitespace = (xml: string): string => xml.replace(/ {2,}|\n/g, '')

const retrieveSavedQueries = async (): Promise<NamedFetchXml[]> => {
  const entityName = getQueryParameter(window.location.search, 'etn')
  if (!entityName) {
    throw new PageError('EntityNameNotFound', 'Could not determine the table for the current view')
  }
  const query = `?$filter=returnedtypecode eq '${encodeURIComponent(entityName)}' and fetchxml ne null&$select=fetchxml,name&$orderby=name asc`
  const savedQueries = await retrieveMultipleOData<{ name: string; fetchxml: string }>('savedquery', query)
  if (savedQueries.length === 0) {
    throw new PageError('NotFound', 'No saved queries found for the current view')
  }
  return savedQueries.map((savedQuery) => ({ name: savedQuery.name, fetchXml: savedQuery.fetchxml }))
}

const resolvePrimaryIdAttribute = async (entityName: string): Promise<string> => {
  try {
    const metadata = await getXrm().Utility.getEntityMetadata(entityName, [])
    return metadata.PrimaryIdAttribute || `${entityName}id`
  } catch {
    return `${entityName}id`
  }
}

const createRecordQuery = async (formContext: Xrm.Page): Promise<NamedFetchXml> => {
  const entityName = formContext.data.entity.getEntityName()
  const entityId = getEntityId(formContext)
  const primaryIdAttribute = await resolvePrimaryIdAttribute(entityName)
  const fetchXml = collapseWhitespace(`
    <fetch>
      <entity name="${entityName}">
        <attribute name="${primaryIdAttribute}" />
        <filter type="and">
          <condition attribute="${primaryIdAttribute}" operator="eq" value="${entityId}" />
        </filter>
      </entity>
    </fetch>`)
  return { name: `Current Record (${entityName})`, fetchXml }
}

const isGridControl = (control: Xrm.Controls.Control): control is Xrm.Controls.GridControl =>
  control.getControlType() === 'subgrid'

const isLookupControl = (control: Xrm.Controls.Control): control is Xrm.Controls.LookupControl =>
  control.getControlType() === 'lookup'

const createSubgridQueries = (formContext: Xrm.Page): NamedFetchXml[] =>
  formContext
    .getControl()
    .filter(isGridControl)
    .filter(
      (control) => typeof control.getFetchXml === 'function' && control.getFetchXml() && control.getRelationship?.(),
    )
    .map((control) => ({
      name: `${control.getLabel()} (${control.getRelationship().name})`,
      fetchXml: control.getFetchXml(),
    }))

const buildRecordUrl = (appUrl: string, entityName: string, id: string): string =>
  `${appUrl}&pagetype=entityrecord&etn=${entityName}&id=${id}`

const generateRecordUrls = (formContext: Xrm.Page, appUrl: string): GeneratedUrl[] => {
  const current: GeneratedUrl = {
    name: 'Current Record/View',
    url: buildRecordUrl(appUrl, formContext.data.entity.getEntityName(), getEntityId(formContext)),
  }
  const lookupUrls = formContext
    .getControl()
    .filter(isLookupControl)
    .flatMap((control) => {
      const value = control.getAttribute()?.getValue()?.[0]
      if (!value) {
        return []
      }
      return [
        {
          name: `${control.getLabel()} (${value.entityType})`,
          url: buildRecordUrl(appUrl, value.entityType, value.id.replace(/[{}]/g, '').toLowerCase()),
        },
      ]
    })
  const unique = new Map<string, GeneratedUrl>()
  for (const url of [current, ...lookupUrls]) {
    if (!unique.has(url.url)) {
      unique.set(url.url, url)
    }
  }
  return [...unique.values()]
}

const hasLabelApi = (control: Xrm.Controls.Control): control is Xrm.Controls.Control & Xrm.Controls.UiLabelElement =>
  'setLabel' in control && 'getLabel' in control

const enableAdminMode = (formContext: Xrm.Page): void => {
  formContext.data.entity.attributes.forEach((attribute) => attribute.setRequiredLevel('none'))
  formContext.ui.controls.forEach((control) => {
    const candidate = control as Partial<Xrm.Controls.StandardControl>
    candidate.setVisible?.(true)
    candidate.setDisabled?.(false)
    candidate.clearNotification?.()
  })
  const selectedTab = formContext.ui.tabs.get((tab) => tab.getDisplayState() === 'expanded')[0]
  formContext.ui.tabs.forEach((tab) => {
    tab.setVisible(true)
    tab.setDisplayState('expanded')
    tab.sections.forEach((section) => section.setVisible(true))
  })
  selectedTab?.setDisplayState('expanded')
  selectedTab?.setFocus()
}

const toChoiceOptions = (options: (OptionSetMetadata['Options'] | undefined) | undefined): ChoiceOption[] =>
  (options ?? []).map((option) => ({ value: option.Value, label: labelText(option.Label) ?? String(option.Value) }))

const toChoiceSet = (name: string | null, scope: string, options: ChoiceOption[]): ChoiceSet | null =>
  name ? { name, scope, options } : null

const collectEntityChoices = (entityName: string, attributes: AttributeMetadataRecord[]): ChoiceSet[] =>
  attributes.flatMap((attribute) => {
    const name = labelText(attribute.DisplayName)
    const options =
      attribute.AttributeType === 'Boolean'
        ? toChoiceOptions(
            [attribute.OptionSet?.FalseOption, attribute.OptionSet?.TrueOption].filter((option) => !!option),
          )
        : toChoiceOptions(attribute.OptionSet?.Options)
    const choiceSet = toChoiceSet(name, entityName, options)
    return choiceSet ? [choiceSet] : []
  })

const retrieveFormControlDetails = (formContext: Xrm.Page): ControlDetails => ({
  entityName: formContext.data.entity.getEntityName(),
  controlType: 'form/edit',
  id: formContext.ui.formSelector.getCurrentItem().getId().replace(/[{}]/g, '').toLowerCase(),
})

const retrieveViewControlDetails = (): ControlDetails => {
  const entityName = getQueryParameter(window.location.search, 'etn')
  const viewId = getQueryParameter(window.location.search, 'viewid')
  if (!entityName || !viewId) {
    throw new PageError('NoFormContext', 'Navigate to a form or view before running this action')
  }
  return { entityName, controlType: 'view', id: viewId.replace(/[{}%7B%7D]/gi, '').toLowerCase() }
}

export const utilitiesHandlers = defineHandlers({
  'utilities.refreshCommandBar': () => {
    const page = getXrm().Page as Xrm.Page | undefined
    if (!page?.ui?.refreshRibbon) {
      throw new PageError('NotSupported', 'The command bar cannot be refreshed on this page')
    }
    page.ui.refreshRibbon()
  },
  'utilities.generateFetchXml': async () => {
    if (getPageKind() !== 'form') {
      return retrieveSavedQueries()
    }
    const formContext = getFormContext()
    return [await createRecordQuery(formContext), ...createSubgridQueries(formContext)]
  },
  'utilities.generateUrls': () => {
    const appUrl = getGlobalContext().getCurrentAppUrl()
    const urls =
      getPageKind() === 'form'
        ? generateRecordUrls(getFormContext(), appUrl)
        : [{ name: 'Current Record/View', url: window.location.href }]
    return { appUrl, urls }
  },
  'utilities.getWebApiUrl': () => `${getGlobalContext().getClientUrl()}${WEB_API_PATH}`,
  'utilities.toggleControlLogicalNames': () => {
    const controls = getFormContext()
      .getControl()
      .filter(hasLabelApi)
      .filter(
        (control) => !!control.controlDescriptor?.Name && !!(control.controlDescriptor?.Label ?? control._defaultLabel),
      )
    const first = controls[0]
    if (!first) {
      throw new PageError('NotFound', 'Could not find any labelled controls on the form')
    }
    const showLogicalNames = first.getLabel() === (first.controlDescriptor?.Label ?? first._defaultLabel)
    controls.forEach((control) => {
      const logicalName = control.controlDescriptor?.Name ?? ''
      const label = control.controlDescriptor?.Label ?? control._defaultLabel ?? ''
      control.setLabel(showLogicalNames ? logicalName : label)
    })
    return { mode: showLogicalNames ? 'logical' : 'label' } as const
  },
  'utilities.enableAdminMode': () => {
    enableAdminMode(getFormContext())
  },
  'utilities.getChoiceMetadata': async (): Promise<ChoiceMetadata> => {
    getXrm()
    const globalOptionSets = await fetchJson<{ value: OptionSetMetadata[] }>('GlobalOptionSetDefinitions')
    const globalChoices = globalOptionSets.value
      .filter((optionSet) => optionSet.OptionSetType === 'Picklist')
      .flatMap((optionSet) => {
        const choiceSet = toChoiceSet(labelText(optionSet.DisplayName), 'global', toChoiceOptions(optionSet.Options))
        return choiceSet ? [choiceSet] : []
      })
    if (getPageKind() !== 'form') {
      return { entityName: null, choices: globalChoices }
    }
    const entityName = getFormContext().data.entity.getEntityName()
    const entityChoices = collectEntityChoices(entityName, await fetchAllOptionSetAttributes(entityName))
    return { entityName, choices: [...entityChoices, ...globalChoices] }
  },
  'utilities.getControlDetails': () => {
    getXrm()
    return getPageKind() === 'form' ? retrieveFormControlDetails(getFormContext()) : retrieveViewControlDetails()
  },
})
