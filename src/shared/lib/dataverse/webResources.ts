import { type DataverseHttp } from "./http";
import { normalizeGuid } from "../guid";

const escapeODataString = (value: string): string => value.replace(/'/g, "''");

export const webResourceIdsByName = async (http: DataverseHttp, names: string[]): Promise<Record<string, string>> => {
	const wanted = [...new Set(names.filter((name) => name.trim() !== ""))];
	if (wanted.length === 0) {
		return {};
	}
	const filter = wanted.map((name) => `name eq '${escapeODataString(name)}'`).join(" or ");
	const response = await http.get<{ value?: { webresourceid: string; name: string }[] }>(
		`webresourceset?$select=webresourceid,name&$filter=${encodeURIComponent(filter)}`
	);
	return Object.fromEntries((response?.value ?? []).map((record) => [record.name, normalizeGuid(record.webresourceid)]));
};
