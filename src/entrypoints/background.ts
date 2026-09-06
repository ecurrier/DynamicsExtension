import { defineBackground } from 'wxt/utils/define-background'

import {
  backgroundHandlers,
  ensureTokenOriginRule,
  reconcileEnvironmentAlerts,
  reconcileImpersonation,
  watchEnvironmentAlerts,
  watchImpersonatedTabs,
} from '@/background'
import { registerBackgroundHandlers } from '@/messaging/background'

export default defineBackground(() => {
  registerBackgroundHandlers(backgroundHandlers)
  watchImpersonatedTabs()
  watchEnvironmentAlerts()
  void reconcileImpersonation()
  void ensureTokenOriginRule()
  void reconcileEnvironmentAlerts()
})
