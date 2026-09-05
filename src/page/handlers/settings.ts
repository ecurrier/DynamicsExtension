import { defineHandlers } from '@/messaging/page'
import { getGlobalContext, retrieveMultiple } from '@/page/xrm'
import { normalizeHttpsUrl } from '@/shared/lib'
import { type CloudType, type EnvironmentDetails } from '@/shared/types'

const POWER_PAGES_FETCH_XML = `
  <fetch count="1">
    <entity name="adx_website">
      <attribute name="adx_websiteid" />
      <attribute name="adx_primarydomainname" />
      <filter type="and">
        <condition attribute="statecode" operator="eq" value="0" />
      </filter>
    </entity>
  </fetch>`

const resolveCloudType = (organizationSettings: Xrm.OrganizationSettings): CloudType => {
  if (!organizationSettings.isSovereignCloud) {
    return 'Commercial'
  }
  return organizationSettings.organizationGeo === 'USG' ? 'GCCHigh' : 'GCC'
}

const retrievePowerPagesUrl = async (): Promise<string | null> => {
  try {
    const websites = await retrieveMultiple<{ adx_primarydomainname?: string }>('adx_website', POWER_PAGES_FETCH_XML)
    return normalizeHttpsUrl(websites[0]?.adx_primarydomainname)
  } catch {
    return null
  }
}

export const settingsHandlers = defineHandlers({
  'settings.getEnvironmentDetails': async (): Promise<EnvironmentDetails> => {
    const globalContext = getGlobalContext()
    const organizationSettings = globalContext.organizationSettings
    return {
      environmentName: organizationSettings.uniqueName,
      environmentId: organizationSettings.bapEnvironmentId ?? '',
      environmentType: resolveCloudType(organizationSettings),
      modelDrivenAppUrl: normalizeHttpsUrl(globalContext.getClientUrl()),
      powerPagesUrl: await retrievePowerPagesUrl(),
      geographicalRegion: organizationSettings.organizationGeo ?? null,
      organizationId: organizationSettings.organizationId ?? null,
      tenantId: organizationSettings.organizationTenant ?? null,
      blockedAttachments: (organizationSettings.attributes?.blockedattachments as string | undefined) ?? null,
      baseCurrency: organizationSettings.baseCurrency?.name ?? null,
    }
  },
})
