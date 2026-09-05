import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script'

import { createBridge } from '@/messaging/page'
import { handlers } from '@/page'

export default defineUnlistedScript(() => {
  if (window.__powerTools?.version === __APP_VERSION__) {
    return
  }
  window.__powerTools = createBridge(handlers, __APP_VERSION__)
})
