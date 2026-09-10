import { type ImpersonationState, type StartImpersonationRequest } from "@/shared/types";

export interface BackgroundCommandMap {
	"auth.ensureTokenOriginRule": { args: void; result: void };
	"impersonation.start": { args: StartImpersonationRequest; result: ImpersonationState };
	"impersonation.stop": { args: { tabId: number }; result: void };
	"impersonation.getState": { args: { tabId: number }; result: ImpersonationState | null };
}

export type BackgroundCommandName = keyof BackgroundCommandMap;
export type BackgroundCommandArgs<N extends BackgroundCommandName> = BackgroundCommandMap[N]["args"];
export type BackgroundCommandResult<N extends BackgroundCommandName> = BackgroundCommandMap[N]["result"];

export const BACKGROUND_MESSAGE_KIND = "power-tools:command";

export interface BackgroundMessage<N extends BackgroundCommandName = BackgroundCommandName> {
	kind: typeof BACKGROUND_MESSAGE_KIND;
	name: N;
	args: BackgroundCommandArgs<N>;
}

export const isBackgroundMessage = (value: unknown): value is BackgroundMessage =>
	typeof value === "object" &&
	value !== null &&
	(value as { kind?: unknown }).kind === BACKGROUND_MESSAGE_KIND &&
	typeof (value as { name?: unknown }).name === "string";
