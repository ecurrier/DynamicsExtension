import {
  type CommandArgs,
  type CommandEnvelope,
  type CommandError,
  type CommandName,
  type CommandResult,
  type PageBridge,
} from '@/messaging/contract'

import { type Handler, type HandlerMap } from './defineHandlers'
import { PageError } from './PageError'

const hasMessage = (error: unknown): error is { message: string; errorCode?: number } =>
  typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string'

export const toCommandError = (error: unknown): CommandError => {
  if (error instanceof PageError) {
    return { name: error.name, message: error.message, details: error.details }
  }
  if (error instanceof Error) {
    return { name: error.name || 'Error', message: error.message }
  }
  if (hasMessage(error)) {
    return { name: 'XrmError', message: error.message, details: { errorCode: error.errorCode } }
  }
  return { name: 'UnknownError', message: String(error) }
}

export const createBridge = (handlers: HandlerMap, version: string): PageBridge => ({
  version,
  async invoke<N extends CommandName>(name: N, args: CommandArgs<N>): Promise<CommandEnvelope<CommandResult<N>>> {
    const handler = handlers[name] as Handler<N> | undefined
    if (!handler) {
      return { ok: false, error: { name: 'UnknownCommand', message: `Unknown command: ${String(name)}` } }
    }
    try {
      const value = await handler(args)
      return { ok: true, value }
    } catch (error) {
      return { ok: false, error: toCommandError(error) }
    }
  },
})
