import { type ConnectionTarget, PAGE_CONNECTION } from "@/shared/connections";

export const PAGE_CONNECTION_KEY = "page";

export const connectionKey = (connection: ConnectionTarget): string =>
	connection.kind === "page" ? PAGE_CONNECTION_KEY : `environment:${connection.environmentId}`;

export const sameConnection = (left: ConnectionTarget, right: ConnectionTarget): boolean => connectionKey(left) === connectionKey(right);

export const hasConnection = (list: readonly ConnectionTarget[], connection: ConnectionTarget): boolean =>
	list.some((candidate) => sameConnection(candidate, connection));

export const addConnection = (list: readonly ConnectionTarget[], connection: ConnectionTarget): readonly ConnectionTarget[] =>
	hasConnection(list, connection) ? list : [...list, connection];

export const removeConnection = (list: readonly ConnectionTarget[], key: string): readonly ConnectionTarget[] => {
	const index = list.findIndex((connection) => connectionKey(connection) === key);
	return index <= 0 ? list : list.filter((_, at) => at !== index);
};

export const setFirstConnection = (list: readonly ConnectionTarget[], connection: ConnectionTarget): readonly ConnectionTarget[] => {
	const first = list[0];
	if (first && sameConnection(first, connection)) {
		return list;
	}
	const index = list.findIndex((candidate) => sameConnection(candidate, connection));
	if (index < 0) {
		return [connection, ...list.slice(1)];
	}
	return list.map((candidate, at) => (at === 0 ? connection : at === index && first ? first : candidate));
};

export interface AddableConnection {
	readonly key: string;
	readonly connection: ConnectionTarget;
	readonly name: string;
}

export interface AddableSources {
	readonly pageAvailable: boolean;
	readonly environments: readonly { id: string; name: string }[];
}

export const addableConnections = (list: readonly ConnectionTarget[], { pageAvailable, environments }: AddableSources): readonly AddableConnection[] => {
	const candidates: AddableConnection[] = [
		...(pageAvailable ? [{ key: PAGE_CONNECTION_KEY, connection: PAGE_CONNECTION, name: "Current page" }] : []),
		...environments.map((environment) => {
			const connection: ConnectionTarget = { kind: "environment", environmentId: environment.id };
			return { key: connectionKey(connection), connection, name: environment.name };
		}),
	];
	return candidates.filter((candidate) => !hasConnection(list, candidate.connection));
};
