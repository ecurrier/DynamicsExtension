import { type BackgroundHandlerMap } from '@/messaging/background'

import { ensureTokenOriginRule } from './auth'
import { getImpersonation, startImpersonation, stopImpersonation } from './impersonation'

export const backgroundHandlers: BackgroundHandlerMap = {
  'auth.ensureTokenOriginRule': () => ensureTokenOriginRule(),
  'impersonation.start': (request) => startImpersonation(request),
  'impersonation.stop': ({ tabId }) => stopImpersonation(tabId),
  'impersonation.getState': ({ tabId }) => getImpersonation(tabId),
}
