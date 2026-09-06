import { defineHandlers, PageError } from '@/messaging/page'
import {
  type AttributeMetadataRecord,
  fetchAllOptionSetAttributes,
  fetchJson,
  getEntityId,
  getFormContext,
  getGlobalContext,
  getPageKind,
  getXrm,
  labelText,
  type OptionSetMetadata,
  pageHttp,
  retrieveMultipleOData,
  WEB_API_PATH,
} from '@/page/xrm'
import { getQueryParameter, normalizeGuid } from '@/shared/lib'
import {
  type AdminModeResult,
  type CapturedControlState,
  type ChoiceMetadata,
  type ChoiceOption,
  type ChoiceSet,
  type ControlDetails,
  type GeneratedUrl,
  type NamedFetchXml,
  type PageTarget,
  type RestoreFormStateResult,
  type SessionSnapshot,
} from '@/shared/types'

const collapseWhitespace = (xml: string): string => xml.replace(/ {2,}|\n/g, '')

const TRACE_SETTING_LABELS: Record<number, string> = {
  0: 'Off',
  1: 'Exception',
  2: 'All',
}

const DEBUG_FLAGS: { name: string; suffix: string }[] = [
  { name: 'Command checker (ribbon)', suffix: '&ribbondebug=true' },
  { name: 'Forms monitor', suffix: '&flags=easyreproautomation=true' },
  { name: 'Performance center', suffix: '&perf=true' },
  { name: 'Chrome-less (no nav or command bar)', suffix: '&navbar=off&cmdbar=false' },
]

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

const hasFetchXml = (control: Xrm.Controls.Control): control is Xrm.Controls.GridControl =>
  typeof (control as Partial<Xrm.Controls.GridControl>).getFetchXml === 'function'

const createSubgridQueries = (formContext: Xrm.Page): NamedFetchXml[] =>
  formContext
    .getControl()
    .filter(isGridControl)
    .filter((control) => hasFetchXml(control) && control.getFetchXml() && control.getRelationship?.())
    .map((control) => ({
      name: `Subgrid as displayed: ${control.getLabel()} (${control.getRelationship().name})`,
      fetchXml: control.getFetchXml(),
    }))

const listPageControls = (): Xrm.Controls.Control[] => {
  const page = window.Xrm?.Page as Xrm.Page | undefined
  const controls = page?.ui?.controls
  if (!controls?.forEach) {
    return []
  }
  const collected: Xrm.Controls.Control[] = []
  controls.forEach((control) => collected.push(control))
  return collected
}

const createAppliedViewQueries = (): NamedFetchXml[] =>
  listPageControls()
    .filter(hasFetchXml)
    .flatMap((control) => {
      let fetchXml = ''
      try {
        fetchXml = control.getFetchXml()
      } catch {
        return []
      }
      if (!fetchXml) {
        return []
      }
      const label = (control as Partial<Xrm.Controls.GridControl>).getLabel?.() ?? control.getName()
      return [{ name: `View as displayed: ${label}`, fetchXml }]
    })

const buildRecordUrl = (appUrl: string, entityName: string, id: string): string =>
  `${appUrl}&pagetype=entityrecord&etn=${entityName}&id=${id}`

const generateRecordUrls = (formContext: Xrm.Page, appUrl: string): GeneratedUrl[] => {
  const current: GeneratedUrl = {
    name: 'Current Record/View',
    url: buildRecordUrl(appUrl, formContext.data.entity.getEntityName(), getEntityId(formContext)),
    group: 'Record',
  }
  const lookupUrls = formContext
    .getControl()
    .filter(isLookupControl)
    .flatMap<GeneratedUrl>((control) => {
      const value = control.getAttribute()?.getValue()?.[0]
      if (!value) {
        return []
      }
      return [
        {
          name: `${control.getLabel()} (${value.entityType})`,
          url: buildRecordUrl(appUrl, value.entityType, value.id.replace(/[{}]/g, '').toLowerCase()),
          group: 'Lookups',
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

const generatePlatformUrls = (baseUrl: string, entityName: string | null, recordId: string | null): GeneratedUrl[] => {
  const clientUrl = getGlobalContext().getClientUrl()
  const urls: GeneratedUrl[] = DEBUG_FLAGS.map((flag) => ({
    name: flag.name,
    url: `${baseUrl}${flag.suffix}`,
    group: 'Debug',
  }))
  if (entityName && recordId) {
    urls.push({
      name: 'Web API record',
      url: `${clientUrl}${WEB_API_PATH}${entityName}s(${recordId})`,
      group: 'Developer',
    })
    urls.push({
      name: 'Audit history',
      url: `${baseUrl}&pagetype=entityrecord&etn=${entityName}&id=${recordId}&navbar=off#auditHistory`,
      group: 'Developer',
    })
  }
  return urls
}

const hasLabelApi = (control: Xrm.Controls.Control): control is Xrm.Controls.Control & Xrm.Controls.UiLabelElement =>
  'setLabel' in control && 'getLabel' in control

const captureControlState = (formContext: Xrm.Page): CapturedControlState[] =>
  formContext.ui.controls.get().map<CapturedControlState>((control) => {
    const candidate = control as Partial<Xrm.Controls.StandardControl>
    return {
      name: control.getName(),
      label: candidate.getLabel?.() ?? control.getName(),
      visible: candidate.getVisible?.() ?? true,
      disabled: candidate.getDisabled?.() ?? false,
      requiredLevel: candidate.getAttribute?.()?.getRequiredLevel?.() ?? 'none',
    }
  })

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

interface OrganizationRecord {
  isauditenabled?: boolean | null
  plugintracelogsetting?: number | null
  isduplicatedetectionenabled?: boolean | null
}

const readOrganizationSettings = async (): Promise<{
  record: OrganizationRecord | null
  backgroundProcessingDisabled: boolean | null
  warning: string | null
}> => {
  let record: OrganizationRecord | null = null
  let warning: string | null = null
  try {
    const response = await fetchJson<{ value?: OrganizationRecord[] }>(
      'organizations?$select=isauditenabled,plugintracelogsetting,isduplicatedetectionenabled&$top=1',
    )
    record = response?.value?.[0] ?? null
  } catch (error) {
    warning = `Organization settings could not be read: ${error instanceof Error ? error.message : String(error)}`
  }
  let backgroundProcessingDisabled: boolean | null = null
  try {
    const response = await fetchJson<{ value?: { disablebackgroundprocessing?: boolean | null }[] }>(
      'organizations?$select=disablebackgroundprocessing&$top=1',
    )
    backgroundProcessingDisabled = response?.value?.[0]?.disablebackgroundprocessing ?? null
  } catch {
    backgroundProcessingDisabled = null
  }
  return { record, backgroundProcessingDisabled, warning }
}

const readUserContext = async (
  userId: string,
): Promise<{ businessUnitName: string | null; teams: string[]; warning: string | null }> => {
  try {
    const http = pageHttp()
    const [user, teams] = await Promise.all([
      http.get<{ businessunitid?: { name?: string | null } | null }>(
        `systemusers(${userId})?$select=systemuserid&$expand=businessunitid($select=name)`,
      ),
      http.get<{ value?: { name?: string | null }[] }>(
        `systemusers(${userId})/teammembership_association?$select=name`,
      ),
    ])
    return {
      businessUnitName: user?.businessunitid?.name ?? null,
      teams: (teams?.value ?? []).map((team) => team.name ?? '').filter((name) => name.length > 0),
      warning: null,
    }
  } catch (error) {
    return {
      businessUnitName: null,
      teams: [],
      warning: `Business unit and teams could not be read: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
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
      const applied = createAppliedViewQueries()
      return [...applied, ...(await retrieveSavedQueries())]
    }
    const formContext = getFormContext()
    return [await createRecordQuery(formContext), ...createSubgridQueries(formContext)]
  },
  'utilities.generateUrls': () => {
    const appUrl = getGlobalContext().getCurrentAppUrl()
    const isForm = getPageKind() === 'form'
    const formContext = isForm ? getFormContext() : null
    const urls = formContext
      ? generateRecordUrls(formContext, appUrl)
      : [{ name: 'Current Record/View', url: window.location.href, group: 'Record' }]
    const baseUrl = urls[0]?.url ?? window.location.href
    const platform = generatePlatformUrls(
      baseUrl,
      formContext ? formContext.data.entity.getEntityName() : getQueryParameter(window.location.search, 'etn'),
      formContext ? getEntityId(formContext) : null,
    )
    return { appUrl, urls: [...urls, ...platform] }
  },
  'utilities.getWebApiUrl': () => `${getGlobalContext().getClientUrl()}${WEB_API_PATH}`,
  'utilities.getPageTarget': (): PageTarget => {
    getXrm()
    const kind = getPageKind()
    const formContext = kind === 'form' ? getFormContext() : null
    const currentForm = formContext?.ui.formSelector.getCurrentItem()
    return {
      kind,
      entityLogicalName: formContext
        ? formContext.data.entity.getEntityName()
        : getQueryParameter(window.location.search, 'etn'),
      recordId: formContext ? getEntityId(formContext) : null,
      formId: currentForm ? normalizeGuid(currentForm.getId()) : null,
      formName: currentForm?.getLabel() ?? null,
      viewId: kind === 'view' ? (getQueryParameter(window.location.search, 'viewid') ?? null) : null,
    }
  },
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
  'utilities.enableAdminMode': (): AdminModeResult => {
    const formContext = getFormContext()
    const snapshot = captureControlState(formContext)
    enableAdminMode(formContext)
    return {
      total: snapshot.length,
      hidden: snapshot.filter((control) => !control.visible),
      disabled: snapshot.filter((control) => control.disabled),
      required: snapshot.filter((control) => control.requiredLevel === 'required'),
      snapshot,
    }
  },
  'utilities.restoreFormState': ({ snapshot }): RestoreFormStateResult => {
    const formContext = getFormContext()
    const byName = new Map(snapshot.map((control) => [control.name, control]))
    let restored = 0
    formContext.ui.controls.forEach((control) => {
      const previous = byName.get(control.getName())
      if (!previous) {
        return
      }
      const candidate = control as Partial<Xrm.Controls.StandardControl>
      candidate.setVisible?.(previous.visible)
      candidate.setDisabled?.(previous.disabled)
      candidate.getAttribute?.()?.setRequiredLevel?.(previous.requiredLevel as Xrm.Attributes.RequirementLevel)
      restored += 1
    })
    return { restored }
  },
  'utilities.getSessionSnapshot': async (): Promise<SessionSnapshot> => {
    const xrm = getXrm()
    const globalContext = getGlobalContext()
    const userSettings = globalContext.userSettings
    const userId = normalizeGuid(userSettings.userId)
    const warnings: string[] = []

    const [organization, userContext] = await Promise.all([readOrganizationSettings(), readUserContext(userId)])
    if (organization.warning) {
      warnings.push(organization.warning)
    }
    if (userContext.warning) {
      warnings.push(userContext.warning)
    }

    let app: SessionSnapshot['app'] = { id: null, name: null, uniqueName: null }
    try {
      const properties = await xrm.Utility.getGlobalContext().getCurrentAppProperties()
      app = {
        id: properties.appId ? normalizeGuid(properties.appId) : null,
        name: properties.displayName ?? null,
        uniqueName: properties.uniqueName ?? null,
      }
    } catch {
      warnings.push('The current app could not be identified.')
    }

    const pageKind = getPageKind()
    const formContext = pageKind === 'form' ? getFormContext() : null
    const currentForm = formContext?.ui.formSelector.getCurrentItem()

    return {
      user: {
        id: userId,
        name: userSettings.userName,
        businessUnitId: null,
        businessUnitName: userContext.businessUnitName,
        roles: [...(userSettings.roles?.get() ?? [])].map((role) => role.name ?? '').filter((name) => name.length > 0),
        teams: userContext.teams,
      },
      organization: {
        version: globalContext.getVersion(),
        isAuditEnabled: organization.record?.isauditenabled ?? null,
        pluginTraceLogSetting:
          organization.record?.plugintracelogsetting === null ||
          organization.record?.plugintracelogsetting === undefined
            ? null
            : (TRACE_SETTING_LABELS[organization.record.plugintracelogsetting] ?? 'Unknown'),
        isDuplicateDetectionEnabled: organization.record?.isduplicatedetectionenabled ?? null,
        backgroundProcessingDisabled: organization.backgroundProcessingDisabled,
      },
      app,
      page: {
        kind: pageKind,
        entityLogicalName: formContext
          ? formContext.data.entity.getEntityName()
          : getQueryParameter(window.location.search, 'etn'),
        recordId: formContext ? getEntityId(formContext) : null,
        formId: currentForm ? normalizeGuid(currentForm.getId()) : null,
        formName: currentForm?.getLabel() ?? null,
      },
      client: {
        client: xrm.Utility.getGlobalContext().client.getClient(),
        formFactor: String(xrm.Utility.getGlobalContext().client.getFormFactor()),
        languageId: userSettings.languageId ?? null,
        timeZone: String(userSettings.getTimeZoneOffsetMinutes?.() ?? ''),
        baseCurrency: globalContext.organizationSettings.baseCurrency?.name ?? null,
      },
      warnings,
    }
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
