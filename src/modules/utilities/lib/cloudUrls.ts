import { type CloudType, type ControlDetails } from '@/shared/types'

export const MAKER_PORTAL_URLS: Record<CloudType, string> = {
  Commercial: 'https://make.powerapps.com/',
  GCC: 'https://make.gov.powerapps.us/',
  GCCHigh: 'https://make.high.powerapps.us/',
  DOD: 'https://make.apps.appsplatform.us/',
}

export const ADMIN_CENTER_URLS: Record<CloudType, string> = {
  Commercial: 'https://admin.powerplatform.microsoft.com/',
  GCC: 'https://gcc.admin.powerplatform.microsoft.us/',
  GCCHigh: 'https://high.admin.powerplatform.microsoft.us/',
  DOD: 'https://admin.appsplatform.us/',
}

export const DEFAULT_SOLUTION_ID = 'fd140aaf-4df4-11dd-bd17-0019b9312238'

const base = (urls: Record<CloudType, string>, cloud: CloudType | null | undefined): string =>
  urls[cloud ?? 'Commercial'] ?? urls.Commercial

export const makerPortalUrl = (cloud: CloudType | null | undefined, environmentId?: string | null): string => {
  const root = base(MAKER_PORTAL_URLS, cloud)
  return environmentId ? `${root}environments/${environmentId}` : root
}

export const adminCenterUrl = (cloud: CloudType | null | undefined, environmentId?: string | null): string => {
  const root = base(ADMIN_CENTER_URLS, cloud)
  return environmentId ? `${root}environments/environment/${environmentId}/hub` : root
}

export const controlEditorUrl = (
  cloud: CloudType | null | undefined,
  environmentId: string,
  solutionId: string,
  control: ControlDetails,
): string =>
  `${base(MAKER_PORTAL_URLS, cloud)}e/${environmentId}/s/${solutionId}/entity/${control.entityName}/${control.controlType}/${control.id}`

export const recordUrl = (appUrl: string, entityName: string, recordId: string): string =>
  `${appUrl}&pagetype=entityrecord&etn=${entityName}&id=${recordId}`
