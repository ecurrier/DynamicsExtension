import { type ConnectionTarget } from "@/shared/connections";

export const CONNECTION_UNAVAILABLE =
	"This Connection is not available. Open a model-driven app in the tab that Power Tools reads, or select a saved Environment.";

export const connectionLabel = (connection: ConnectionTarget, environmentNames: Readonly<Record<string, { name: string } | undefined>>): string =>
	connection.kind === "page" ? "Current page" : (environmentNames[connection.environmentId]?.name ?? "Removed Environment");
