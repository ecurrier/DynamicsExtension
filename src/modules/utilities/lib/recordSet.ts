export interface RecordSetRow {
	id: string;
	primary: string;
	values: Record<string, string>;
}

export interface RecordSetPosition {
	index: number;
	total: number;
	hasPrevious: boolean;
	hasNext: boolean;
	caption: string;
}

const formatValue = (value: unknown): string => {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "object") {
		return "";
	}
	return String(value);
};

export const recordSetColumns = (rows: Record<string, unknown>[], limit = 6): string[] => {
	const seen: string[] = [];
	for (const row of rows) {
		for (const key of Object.keys(row)) {
			if (key.startsWith("@") || key.startsWith("_") || key.endsWith("_value") || seen.includes(key)) {
				continue;
			}
			seen.push(key);
		}
	}
	return seen.slice(0, limit);
};

export const recordSetRows = (rows: Record<string, unknown>[], entityLogicalName: string): RecordSetRow[] => {
	const idKey = `${entityLogicalName}id`;
	const columns = recordSetColumns(rows);
	const primaryKey = columns.find((key) => key !== idKey) ?? idKey;
	return rows.flatMap((row) => {
		const id = formatValue(row[idKey]);
		if (!id) {
			return [];
		}
		return [
			{
				id,
				primary: formatValue(row[primaryKey]) || id,
				values: Object.fromEntries(columns.map((key) => [key, formatValue(row[key])])),
			},
		];
	});
};

export const recordSetPosition = (rows: RecordSetRow[], currentId: string | null): RecordSetPosition => {
	const index = currentId ? rows.findIndex((row) => row.id.toLowerCase() === currentId.toLowerCase()) : -1;
	return {
		index,
		total: rows.length,
		hasPrevious: index > 0,
		hasNext: index >= 0 && index < rows.length - 1,
		caption: rows.length === 0 ? "No records loaded" : index < 0 ? `${rows.length} records` : `Record ${index + 1} of ${rows.length}`,
	};
};

export const recordSetStep = (rows: RecordSetRow[], currentId: string | null, direction: -1 | 1): RecordSetRow | null => {
	const { index } = recordSetPosition(rows, currentId);
	if (index < 0) {
		return rows[0] ?? null;
	}
	return rows[index + direction] ?? null;
};

export const fetchXmlAttributes = (fetchXml: string): string[] => {
	const entity = /<entity\b[^>]*>([\s\S]*?)<\/entity>/i.exec(fetchXml)?.[1] ?? fetchXml;
	const withoutLinks = entity.replace(/<link-entity\b[\s\S]*?<\/link-entity>/gi, "").replace(/<link-entity\b[^>]*\/>/gi, "");
	const names: string[] = [];
	for (const match of withoutLinks.matchAll(/<attribute\b[^>]*\bname\s*=\s*"([^"]+)"/gi)) {
		const name = match[1];
		if (name && !names.includes(name)) {
			names.push(name);
		}
	}
	return names;
};

const FORMATTED = "@OData.Community.Display.V1.FormattedValue";

export const valueKeys = (key: string): string[] => (key.startsWith("_") && key.endsWith("_value") ? [key] : [key, `_${key}_value`]);

export const displayValue = (row: Record<string, unknown>, key: string): string => {
	const candidates = valueKeys(key);
	for (const candidate of candidates) {
		const formatted = row[`${candidate}${FORMATTED}`];
		if (typeof formatted === "string" && formatted !== "") {
			return formatted;
		}
	}
	for (const candidate of candidates) {
		const raw = row[candidate];
		if (raw !== null && raw !== undefined && typeof raw !== "object") {
			return String(raw);
		}
	}
	return "";
};
