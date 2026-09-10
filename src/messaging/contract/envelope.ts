import { type CommandArgs, type CommandName, type CommandResult } from "./commands";

export interface CommandError {
	name: string;
	message: string;
	details?: unknown;
}

export type CommandEnvelope<T> = { ok: true; value: T } | { ok: false; error: CommandError };

export interface PageBridge {
	version: string;
	invoke<N extends CommandName>(name: N, args: CommandArgs<N>): Promise<CommandEnvelope<CommandResult<N>>>;
}

declare global {
	interface Window {
		__powerTools?: PageBridge;
	}
}
