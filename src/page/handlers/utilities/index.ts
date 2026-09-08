import { fetchXmlHandlers } from './fetchXml'
import { formColumnsHandlers } from './formColumns'
import { formStateHandlers } from './formState'
import { pageTargetHandlers } from './pageTarget'
import { recordPayloadHandlers } from './recordPayload'
import { recordUrlsHandlers } from './recordUrls'
import { sessionSnapshotHandlers } from './sessionSnapshot'

export const utilitiesHandlers = {
  ...fetchXmlHandlers,
  ...recordUrlsHandlers,
  ...formStateHandlers,
  ...sessionSnapshotHandlers,
  ...pageTargetHandlers,
  ...formColumnsHandlers,
  ...recordPayloadHandlers,
}
