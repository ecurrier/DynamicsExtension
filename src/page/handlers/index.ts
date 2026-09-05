import { type HandlerMap } from '@/messaging/page'

import { formsHandlers } from './forms'
import { globalHandlers } from './global'
import { securityHandlers } from './security'
import { settingsHandlers } from './settings'
import { templatesHandlers } from './templates'
import { tracesHandlers } from './traces'
import { utilitiesHandlers } from './utilities'
import { webApiHandlers } from './webapi'

export const handlers: HandlerMap = {
  ...globalHandlers,
  ...settingsHandlers,
  ...utilitiesHandlers,
  ...templatesHandlers,
  ...webApiHandlers,
  ...formsHandlers,
  ...securityHandlers,
  ...tracesHandlers,
}
