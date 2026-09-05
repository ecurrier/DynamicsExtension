import { defineBackground } from 'wxt/utils/define-background'

import { backgroundHandlers, ensureTokenOriginRule, reconcileImpersonation, watchImpersonatedTabs } from '@/background'
import { registerBackgroundHandlers } from '@/messaging/background'

export default defineBackground(() => {
  registerBackgroundHandlers(backgroundHandlers)
  watchImpersonatedTabs()
  void reconcileImpersonation()
  void ensureTokenOriginRule()
})
