import { getGlobalContext } from './getXrm'

export interface OrganizationInfo {
  uniqueName: string
  bapEnvironmentId: string | null
  isSovereignCloud: boolean
  organizationGeo: string | null
  organizationId: string | null
  organizationTenant: string | null
  blockedAttachments: string | null
  baseCurrencyName: string | null
}

export interface GlobalContextPort {
  clientUrl: () => string
  organization: () => OrganizationInfo
}

export const xrmGlobalContext = (): GlobalContextPort => ({
  clientUrl: () => getGlobalContext().getClientUrl(),
  organization: () => {
    const settings = getGlobalContext().organizationSettings
    return {
      uniqueName: settings.uniqueName,
      bapEnvironmentId: settings.bapEnvironmentId ?? null,
      isSovereignCloud: !!settings.isSovereignCloud,
      organizationGeo: settings.organizationGeo ?? null,
      organizationId: settings.organizationId ?? null,
      organizationTenant: settings.organizationTenant ?? null,
      blockedAttachments: (settings.attributes?.blockedattachments as string | undefined) ?? null,
      baseCurrencyName: settings.baseCurrency?.name ?? null,
    }
  },
})
