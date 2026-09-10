import { type QueryKey } from "@tanstack/react-query";

import { invoke, PageCommandError, pageKeys } from "@/messaging/client";
import { type CommandArgs, type CommandName, type CommandResult } from "@/messaging/contract";
import { type DataverseHttp } from "@/shared/lib";
import { type Environment } from "@/shared/storage";

import { connectionKeys } from "./connectionKeys";
import { getEnvironmentHttp } from "./environmentHttp";

type CommandFor<NS extends string, K extends string> = `${NS}.${K}` & CommandName;

export type GatewayOperations<NS extends string, K extends string> = {
	[P in K]: (args: CommandArgs<CommandFor<NS, P>>) => Promise<CommandResult<CommandFor<NS, P>>>;
};

type SuffixOf<NS extends string, N extends CommandName> = N extends `${NS}.${infer S}` ? S : never;

export type NamespaceOperations<NS extends string> = SuffixOf<NS, CommandName>;

export interface GatewayDefinition<NS extends string, K extends string, PK extends string, Ops extends GatewayOperations<NS, K>> {
	namespace: NS;
	operations: readonly K[];
	pageOnly?: readonly PK[];
	factory: (http: DataverseHttp) => Ops;
	timeouts?: Partial<Record<K | PK, number>>;
}

type Uncovered<NS extends string, K extends string, PK extends string, X extends string> = Exclude<NamespaceOperations<NS>, K | PK | X>;

export type GatewaySource = { kind: "page"; tabId: number | null; ready: boolean } | { kind: "environment"; environment: Environment } | { kind: "missing" };

export type Gateway<NS extends string, K extends string, PK extends string> =
	| {
			mode: "page";
			ready: boolean;
			environment: null;
			key: (name: K | PK, args?: unknown) => QueryKey;
			ops: GatewayOperations<NS, K | PK>;
	  }
	| {
			mode: "environment";
			ready: boolean;
			environment: Environment | null;
			key: (name: K, args?: unknown) => QueryKey;
			ops: GatewayOperations<NS, K>;
	  };

type AnyOperation = (args: unknown) => Promise<unknown>;

export const defineGateway = <NS extends string, K extends string, Ops extends GatewayOperations<NS, K>, PK extends string = never, X extends string = never>(
	definition: GatewayDefinition<NS, K, PK, Ops> & { excluded?: readonly X[] } & ([Uncovered<NS, K, PK, X>] extends [never]
			? unknown
			: { unlistedOperations: Uncovered<NS, K, PK, X> })
): GatewayDefinition<NS, K, PK, Ops> => definition;

const buildOps = <T, K extends string>(names: readonly K[], build: (name: K) => AnyOperation): T =>
	Object.fromEntries(names.map((name) => [name, build(name)])) as T;

export const createGateway = <NS extends string, K extends string, PK extends string, Ops extends GatewayOperations<NS, K>>(
	definition: GatewayDefinition<NS, K, PK, Ops>,
	source: GatewaySource
): Gateway<NS, K, PK> => {
	const { namespace, operations, pageOnly, factory, timeouts } = definition;
	const commandFor = (name: K | PK): CommandName => `${namespace}.${name}` as CommandName;
	if (source.kind === "page") {
		const { tabId, ready } = source;
		const requireTab = (command: CommandName): number => {
			if (tabId === null) {
				throw new PageCommandError(command, "NoActiveTab", "No active browser tab was found");
			}
			return tabId;
		};
		const names: readonly (K | PK)[] = [...operations, ...(pageOnly ?? [])];
		return {
			mode: "page",
			ready,
			environment: null,
			key: (name, args) => [...pageKeys.tab(tabId ?? -1), commandFor(name), args ?? null],
			ops: buildOps<GatewayOperations<NS, K | PK>, K | PK>(names, (name) => {
				const command = commandFor(name);
				return async (args) => invoke(requireTab(command), command, args as never, { timeoutMs: timeouts?.[name] });
			}),
		};
	}
	if (source.kind === "missing") {
		return {
			mode: "environment",
			ready: false,
			environment: null,
			key: (name, args) => connectionKeys.operation("missing", commandFor(name), args),
			ops: buildOps<GatewayOperations<NS, K>, K>(operations, () => () => Promise.reject(new Error("The selected environment no longer exists"))),
		};
	}
	const { environment } = source;
	return {
		mode: "environment",
		ready: true,
		environment,
		key: (name, args) => connectionKeys.operation(environment.id, commandFor(name), args),
		ops: buildOps<GatewayOperations<NS, K>, K>(
			operations,
			(name) => (args) =>
				getEnvironmentHttp(environment, { timeoutMs: timeouts?.[name] })
					.then(factory)
					.then((ops) => (ops[name] as unknown as AnyOperation)(args))
		),
	};
};
