import { type RecordCount, type RecordCountRequest, type RecordCounts } from "@/shared/types";

import { requireLogicalName } from "./guards";
import { type DataverseHttp } from "./http";
import { chunk } from "../chunk";

const BATCH_SIZE = 40;

interface RecordCountResponse {
	EntityRecordCountCollection?: {
		Keys?: string[] | null;
		Values?: number[] | null;
	} | null;
}

export const mapRecordCounts = (response: RecordCountResponse | undefined): RecordCount[] => {
	const keys = response?.EntityRecordCountCollection?.Keys ?? [];
	const values = response?.EntityRecordCountCollection?.Values ?? [];
	return keys.map((key, index) => ({ entityLogicalName: key, count: values[index] ?? 0 }));
};

export interface RecordCountOperations {
	getRecordCounts: (request: RecordCountRequest) => Promise<RecordCounts>;
}

export const recordCountOperations = (http: DataverseHttp): RecordCountOperations => ({
	getRecordCounts: async ({ entityLogicalNames }) => {
		const names = [...new Set(entityLogicalNames.map((name) => requireLogicalName(name, "Table")))];
		const counts: RecordCount[] = [];
		for (const group of chunk(names, BATCH_SIZE)) {
			const parameter = encodeURIComponent(JSON.stringify(group));
			const response = await http.get<RecordCountResponse>(`RetrieveTotalRecordCount(EntityNames=@p)?@p=${parameter}`).catch(() => undefined);
			counts.push(...mapRecordCounts(response));
		}
		const returned = new Set(counts.map((count) => count.entityLogicalName));
		return {
			counts: counts.sort((left, right) => right.count - left.count),
			missing: names.filter((name) => !returned.has(name)),
		};
	},
});
