export interface FormPresetFile {
	name: string;
	fields: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export const serializeFormPreset = (preset: FormPresetFile): string => JSON.stringify({ presetName: preset.name, fields: preset.fields }, null, 2);

const readName = (parsed: Record<string, unknown>): string => {
	for (const key of ["presetName", "templateName", "name"]) {
		const value = parsed[key];
		if (typeof value === "string") {
			return value;
		}
	}
	return "";
};

export const parseFormPresetFile = (text: string): FormPresetFile => {
	const parsed: unknown = JSON.parse(text);
	if (!isRecord(parsed)) {
		throw new Error("The file does not contain a form preset object");
	}
	const fields = isRecord(parsed.fields) ? parsed.fields : !("fields" in parsed) ? parsed : {};
	return { name: readName(parsed), fields };
};

export const parseFields = (text: string): Record<string, unknown> => {
	const parsed: unknown = JSON.parse(text);
	if (!isRecord(parsed)) {
		throw new Error("Preset fields must be a JSON object");
	}
	return parsed;
};

const sortKeys = (fields: Record<string, unknown>): Record<string, unknown> =>
	Object.fromEntries(Object.entries(fields).sort(([left], [right]) => left.localeCompare(right)));

export const formatFields = (fields: Record<string, unknown>): string => JSON.stringify(sortKeys(fields), null, 2);

export const exportFileName = (name: string): string => `Form Preset - ${name.trim() || "Untitled"}.json`;
