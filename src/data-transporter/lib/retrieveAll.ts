import { type RetrievePageRequest, type RetrievePageResult, type TransportRow } from "@/shared/types";

export type RetrievePage = (request: RetrievePageRequest) => Promise<RetrievePageResult>;

export interface RetrieveAllOptions {
	entitySetName: string;
	fetchXml: string;
	maxRows: number;
	pageSize: number;
}

export interface RetrieveAllResult {
	rows: TransportRow[];
	truncated: boolean;
}

export const retrieveAllRows = async (
	retrievePage: RetrievePage,
	options: RetrieveAllOptions,
	onProgress?: (count: number) => void,
	signal?: AbortSignal
): Promise<RetrieveAllResult> => {
	const rows: TransportRow[] = [];
	const pageSize = Math.max(1, Math.min(options.pageSize, options.maxRows));
	let nextLink: string | null = null;
	do {
		if (signal?.aborted) {
			return { rows, truncated: true };
		}
		const page: RetrievePageResult = await retrievePage({
			entitySetName: options.entitySetName,
			fetchXml: nextLink ? null : options.fetchXml,
			nextLink,
			pageSize,
		});
		rows.push(...page.rows);
		onProgress?.(rows.length);
		nextLink = page.nextLink;
		if (rows.length >= options.maxRows) {
			return { rows: rows.slice(0, options.maxRows), truncated: rows.length > options.maxRows || nextLink !== null };
		}
	} while (nextLink);
	return { rows, truncated: false };
};
