import { browser } from 'wxt/browser'

import {
  BACKGROUND_MESSAGE_KIND,
  type BackgroundCommandArgs,
  type BackgroundCommandName,
  type BackgroundCommandResult,
  type BackgroundMessage,
  type CommandEnvelope,
} from '@/messaging/contract'

import { PageCommandError } from './PageCommandError'

export const invokeBackground = async <N extends BackgroundCommandName>(
  name: N,
  args: BackgroundCommandArgs<N>,
): Promise<BackgroundCommandResult<N>> => {
  const message: BackgroundMessage<N> = { kind: BACKGROUND_MESSAGE_KIND, name, args }
  let envelope: CommandEnvelope<BackgroundCommandResult<N>> | undefined
  try {
    envelope = (await browser.runtime.sendMessage(message)) as CommandEnvelope<BackgroundCommandResult<N>> | undefined
  } catch (error) {
    throw new PageCommandError(name, 'BridgeUnavailable', error instanceof Error ? error.message : String(error))
  }
  if (!envelope) {
    throw new PageCommandError(name, 'BridgeUnavailable', 'The extension background service did not respond')
  }
  if (!envelope.ok) {
    throw new PageCommandError(name, envelope.error.name, envelope.error.message, envelope.error.details)
  }
  return envelope.value
}
