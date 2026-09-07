import { choiceMetadataHandlers } from './choiceMetadata'
import { fetchXmlHandlers } from './fetchXml'
import { formStateHandlers } from './formState'
import { pageTargetHandlers } from './pageTarget'
import { recordUrlsHandlers } from './recordUrls'
import { sessionSnapshotHandlers } from './sessionSnapshot'

export const utilitiesHandlers = {
  ...fetchXmlHandlers,
  ...recordUrlsHandlers,
  ...formStateHandlers,
  ...choiceMetadataHandlers,
  ...sessionSnapshotHandlers,
  ...pageTargetHandlers,
}
