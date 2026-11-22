import { type QueryRow } from "@/shared/types";

export const isAnnotationKey = (key: string): boolean => key.includes("@");

export const resultColumnKeys = (rows: readonly QueryRow[]): string[] => {
	const seen = new Set<string>();
	for (const row of rows) {
		for (const key of Object.keys(row)) {
			if (!isAnnotationKey(key)) {
				seen.add(key);
			}
		}
	}
	return [...seen];
};

export const cellText = (value: unknown): string => {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
};

export const cellSortValue = (value: unknown): string | number | null => {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "number") {
		return value;
	}
	return cellText(value);
};
