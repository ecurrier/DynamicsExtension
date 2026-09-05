import { Button, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle } from '@fluentui/react-components'
import { ShieldCheckmark20Regular } from '@fluentui/react-icons'

import { readPopupLaunch } from '@/shared/extension'

import { useAppToast } from '../Toast'
import { useHostAccess } from './useHostAccess'

interface HostAccessBannerProps {
  origin: string | null
  reason: string
}

const promptHint = (): string =>
  readPopupLaunch().mode === 'popup'
    ? 'Chrome asks for this permission in a prompt that closes the popup, so allow it first and reopen Power Tools if it closes.'
    : 'Chrome asks for this permission in a prompt.'

export const HostAccessBanner = ({ origin, reason }: HostAccessBannerProps) => {
  const toast = useAppToast()
  const access = useHostAccess(origin)
  if (origin === null || access.granted !== false) {
    return null
  }
  const host = new URL(origin).host
  const allow = async () => {
    if (!(await access.request())) {
      toast.error('Access was not granted', `Power Tools cannot continue without access to ${host}`)
    }
  }
  return (
    <MessageBar intent="warning" layout="multiline">
      <MessageBarBody>
        <MessageBarTitle>Allow access to {host}</MessageBarTitle>
        {reason} {promptHint()} You only need to do this once per environment.
      </MessageBarBody>
      <MessageBarActions>
        <Button
          appearance="primary"
          icon={<ShieldCheckmark20Regular />}
          disabled={access.requesting}
          onClick={() => void allow()}
        >
          Allow access
        </Button>
      </MessageBarActions>
    </MessageBar>
  )
}
