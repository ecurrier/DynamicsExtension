export const connectionKeys = {
	all: ["connection"] as const,
	environment: (environmentId: string) => ["connection", environmentId] as const,
	operation: (environmentId: string, name: string, args?: unknown) => ["connection", environmentId, name, args ?? null] as const,
};
