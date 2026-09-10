import { browser } from "wxt/browser";

import {
	type BackgroundCommandArgs,
	type BackgroundCommandName,
	type BackgroundCommandResult,
	type CommandEnvelope,
	type CommandError,
	isBackgroundMessage,
} from "@/messaging/contract";

export type BackgroundHandler<N extends BackgroundCommandName> = (
	args: BackgroundCommandArgs<N>
) => BackgroundCommandResult<N> | Promise<BackgroundCommandResult<N>>;

export type BackgroundHandlerMap = { [N in BackgroundCommandName]: BackgroundHandler<N> };

export const defineBackgroundHandlers = <T extends Partial<BackgroundHandlerMap>>(handlers: T): T => handlers;

const toCommandError = (error: unknown): CommandError =>
	error instanceof Error ? { name: error.name || "Error", message: error.message } : { name: "UnknownError", message: String(error) };

export const registerBackgroundHandlers = (handlers: BackgroundHandlerMap): void => {
	browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
		if (!isBackgroundMessage(message)) {
			return false;
		}
		const handler = handlers[message.name] as BackgroundHandler<BackgroundCommandName> | undefined;
		const respond = (envelope: CommandEnvelope<unknown>) => sendResponse(envelope);
		if (!handler) {
			respond({ ok: false, error: { name: "UnknownCommand", message: `Unknown command: ${message.name}` } });
			return false;
		}
		Promise.resolve()
			.then(() => handler(message.args as never))
			.then(
				(value) => respond({ ok: true, value }),
				(error: unknown) => respond({ ok: false, error: toCommandError(error) })
			);
		return true;
	});
};
