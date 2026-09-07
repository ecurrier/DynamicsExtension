import { defineHandlers } from '@/messaging/page'
import { type EnvironmentAlertRequest, type EnvironmentAlertResult } from '@/shared/types'

const APP_WAIT_MS = 45_000
const APP_POLL_MS = 500

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const currentApp = (): Xrm.App | null => {
  const app = window.Xrm?.App
  return app && typeof app.addGlobalNotification === 'function' ? app : null
}

const waitForApp = async (): Promise<Xrm.App | null> => {
  const deadline = Date.now() + APP_WAIT_MS
  while (Date.now() < deadline) {
    const app = currentApp()
    if (app) {
      return app
    }
    await wait(APP_POLL_MS)
  }
  return null
}

const alertKey = (request: EnvironmentAlertRequest): string =>
  JSON.stringify([request.environmentId, request.alert?.level, request.alert?.message, request.alert?.showCloseButton])

const clearCurrent = async (app: Xrm.App): Promise<boolean> => {
  const current = window.__powerToolsAlert
  if (!current) {
    return false
  }
  delete window.__powerToolsAlert
  await Promise.resolve(app.clearGlobalNotification(current.id)).catch(() => undefined)
  return true
}

const apply = async (request: EnvironmentAlertRequest): Promise<EnvironmentAlertResult> => {
  const enabled = !!request.alert?.enabled && !!request.alert.message.trim()
  const app = enabled ? await waitForApp() : currentApp()
  if (!enabled) {
    const cleared = app ? await clearCurrent(app) : false
    return { shown: false, reason: cleared ? 'cleared' : 'disabled' }
  }
  if (!app || !request.alert) {
    return { shown: false, reason: 'no-app' }
  }
  const key = alertKey(request)
  if (window.__powerToolsAlert?.key === key) {
    return { shown: true, reason: 'unchanged' }
  }
  await clearCurrent(app)
  const id = await app.addGlobalNotification({
    type: 2,
    level: request.alert.level as XrmEnum.AppNotificationLevel,
    message: request.alert.message,
    showCloseButton: request.alert.showCloseButton,
  })
  window.__powerToolsAlert = { key, id }
  return { shown: true, reason: 'shown' }
}

const serialize = (task: () => Promise<EnvironmentAlertResult>): Promise<EnvironmentAlertResult> => {
  const previous = window.__powerToolsAlertPending ?? Promise.resolve()
  const next = previous.then(task, task)
  window.__powerToolsAlertPending = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

export const alertHandlers = defineHandlers({
  'global.showEnvironmentAlert': (request) => serialize(() => apply(request)),
  'global.clearEnvironmentAlert': async () => {
    await serialize(() => apply({ environmentId: '', alert: null }))
  },
})
