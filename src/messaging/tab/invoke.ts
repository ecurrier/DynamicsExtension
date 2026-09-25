import { browser } from "wxt/browser";

import { ALERT_COMMAND_TIMEOUT_MS, type CommandArgs, type CommandEnvelope, type CommandName, type CommandResult } from "@/messaging/contract";

import { ensurePageBridge } from "./ensurePageBridge";
import { PageCommandError } from "./PageCommandError";

export interface InvokeOptions {
	timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

const COMMAND_TIMEOUTS: Partial<Record<CommandName, number>> = {
	"webapi.executeFetchXml": 90_000,
	"webapi.saveRecord": 120_000,
	"forms.updateFormXml": 120_000,
	"traces.query": 120_000,
	"traces.delete": 300_000,
	"environmentVariables.getDefinitions": 60_000,
	"environmentVariables.setValue": 60_000,
	"pluginSteps.getSteps": 90_000,
	"pluginSteps.setState": 120_000,
	"pluginPackages.list": 90_000,
	"pluginPackages.update": 180_000,
	"global.showEnvironmentAlert": ALERT_COMMAND_TIMEOUT_MS,
	"global.clearEnvironmentAlert": ALERT_COMMAND_TIMEOUT_MS,
	"transport.listEntities": 90_000,
	"transport.getEntityMetadata": 90_000,
	"transport.retrievePage": 120_000,
	"investigate.getTableAutomation": 90_000,
	"investigate.getRecordAccess": 90_000,
	"investigate.getRecordHistory": 90_000,
	"investigate.getColumnUsage": 180_000,
	"investigate.getTableMetadata": 90_000,
	"investigate.getRecordCounts": 120_000,
	"investigate.listTables": 90_000,
	"investigate.getTableColumns": 90_000,
	"forms.getFormDiagnostics": 60_000,
};

const bridgeThunk = (name: string, args: unknown) => window.__powerTools?.invoke(name as never, args as never);

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, createError: () => Error): Promise<T> =>
	new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(createError()), timeoutMs);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error: unknown) => {
				clearTimeout(timer);
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		);
	});

const execute = async <N extends CommandName>(tabId: number, name: N, args: CommandArgs<N>) => {
	const results = await browser.scripting.executeScript({
		target: { tabId },
		world: "MAIN",
		func: bridgeThunk,
		args: [name, args ?? null],
	});
	return results[0]?.result as CommandEnvelope<CommandResult<N>> | undefined;
};

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const invoke = async <N extends CommandName>(tabId: number, name: N, args: CommandArgs<N>, options: InvokeOptions = {}): Promise<CommandResult<N>> => {
	const timeoutMs = options.timeoutMs ?? COMMAND_TIMEOUTS[name] ?? DEFAULT_TIMEOUT_MS;
	const run = async (): Promise<CommandResult<N>> => {
		let envelope: CommandEnvelope<CommandResult<N>> | undefined;
		try {
			envelope = await execute(tabId, name, args);
			if (envelope === undefined) {
				await ensurePageBridge(tabId);
				envelope = await execute(tabId, name, args);
			}
		} catch (error) {
			throw new PageCommandError(name, "InjectionFailed", describeError(error));
		}
		if (envelope === undefined) {
			throw new PageCommandError(name, "BridgeUnavailable", "Power Tools could not connect to this page");
		}
		if (!envelope.ok) {
			throw new PageCommandError(name, envelope.error.name, envelope.error.message, envelope.error.details);
		}
		return envelope.value;
	};
	return withTimeout(
		run(),
		timeoutMs,
		() => new PageCommandError(name, "Timeout", `The page did not respond within ${Math.round(timeoutMs / 1000)} seconds`)
	);
};
