import { defineHandlers } from '@/messaging/page'
import { retrieveMultiple } from '@/page/xrm'
import { type PageContext } from '@/shared/types'

const SOLUTIONS_FETCH_XML = `
  <fetch>
    <entity name="solution">
      <attribute name="solutionid" />
      <attribute name="friendlyname" />
      <order attribute="friendlyname" descending="false" />
      <filter type="and">
        <condition attribute="ismanaged" operator="eq" value="0" />
      </filter>
    </entity>
  </fetch>`

export const globalHandlers = defineHandlers({
  'global.getPageContext': (): PageContext | null => {
    if (window.Xrm) {
      return 'model-driven-app'
    }
    if (window.portal) {
      return 'portal'
    }
    return null
  },
  'global.getSolutions': async () => {
    const solutions = await retrieveMultiple<{ solutionid: string; friendlyname: string }>(
      'solution',
      SOLUTIONS_FETCH_XML,
    )
    return solutions.map((solution) => ({ id: solution.solutionid, name: solution.friendlyname }))
  },
})
