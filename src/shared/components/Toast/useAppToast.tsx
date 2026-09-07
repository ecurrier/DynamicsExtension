import { Toast, ToastBody, ToastTitle, useToastController } from '@fluentui/react-components'
import { useMemo } from 'react'

import { isPageCommandError } from '@/messaging/client'

export const APP_TOASTER_ID = 'app-toaster'

const describe = (error: unknown): string => {
  if (isPageCommandError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export const useAppToast = () => {
  const { dispatchToast } = useToastController(APP_TOASTER_ID)
  return useMemo(
    () => ({
      success: (title: string, body?: string) =>
        dispatchToast(
          <Toast>
            <ToastTitle>{title}</ToastTitle>
            {body ? <ToastBody>{body}</ToastBody> : null}
          </Toast>,
          { intent: 'success' },
        ),
      info: (title: string, body?: string) =>
        dispatchToast(
          <Toast>
            <ToastTitle>{title}</ToastTitle>
            {body ? <ToastBody>{body}</ToastBody> : null}
          </Toast>,
          { intent: 'info' },
        ),
      error: (title: string, error?: unknown) =>
        dispatchToast(
          <Toast>
            <ToastTitle>{title}</ToastTitle>
            {error !== undefined ? <ToastBody>{describe(error)}</ToastBody> : null}
          </Toast>,
          { intent: 'error', timeout: 6000 },
        ),
    }),
    [dispatchToast],
  )
}
