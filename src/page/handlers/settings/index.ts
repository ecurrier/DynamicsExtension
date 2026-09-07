import { defineHandlers } from '@/messaging/page'
import { retrieveMultiple, xrmGlobalContext } from '@/page/xrm'
import { normalizeHttpsUrl } from '@/shared/lib'
import { type EnvironmentDetails } from '@/shared/types'

import { buildEnvironmentDetails } from './environmentDetails'

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

const retrievePowerPagesUrl = async (): Promise<string | null> => {
  try {
    const websites = await retrieveMultiple<{ adx_primarydomainname?: string }>('adx_website', POWER_PAGES_FETCH_XML)
    return normalizeHttpsUrl(websites[0]?.adx_primarydomainname)
  } catch {
    return null
  }
}

export const settingsHandlers = defineHandlers({
  'settings.getEnvironmentDetails': async (): Promise<EnvironmentDetails> =>
    buildEnvironmentDetails(xrmGlobalContext(), await retrievePowerPagesUrl()),
})
