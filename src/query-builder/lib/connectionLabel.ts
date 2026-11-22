import { type ConnectionTarget } from "@/shared/connections";

export const connectionLabel = (connection: ConnectionTarget, environmentNames: Readonly<Record<string, { name: string } | undefined>>): string =>
	connection.kind === "page" ? "Current page" : (environmentNames[connection.environmentId]?.name ?? "Removed environment");
