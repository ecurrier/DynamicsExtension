import { type CommandArgs, type CommandName, type CommandResult } from '@/messaging/contract'

export type Handler<N extends CommandName> = (args: CommandArgs<N>) => CommandResult<N> | Promise<CommandResult<N>>

export type HandlerMap = { [N in CommandName]: Handler<N> }

export const defineHandlers = <T extends Partial<HandlerMap>>(handlers: T): T => handlers
