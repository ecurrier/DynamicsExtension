export type ConnectionTarget = { kind: "page" } | { kind: "environment"; environmentId: string };

export const PAGE_CONNECTION: ConnectionTarget = { kind: "page" };

export const isPageConnection = (connection: ConnectionTarget): boolean => connection.kind === "page";
