import { TEMPLATE_KINDS, TEMPLATE_LANGUAGES, type Template, type TemplateKind, type TemplateLanguage, type TemplateSetting } from "@/shared/types";

export const TEMPLATE_FILE_KIND = "power-tools-template";

export const TEMPLATE_FILE_VERSION = 1;

export interface ParseTemplateFileOptions {
	newId: () => string;
	now: () => string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const isTemplateKind = (value: unknown): value is TemplateKind => typeof value === "string" && TEMPLATE_KINDS.includes(value as TemplateKind);

const isTemplateLanguage = (value: unknown): value is TemplateLanguage =>
	typeof value === "string" && TEMPLATE_LANGUAGES.some((language) => language.value === value);

export const serializeTemplateFile = (template: Template): string =>
	JSON.stringify(
		{
			kind: TEMPLATE_FILE_KIND,
			version: TEMPLATE_FILE_VERSION,
			template: {
				name: template.name,
				kind: template.kind,
				language: template.language,
				text: template.text,
				settings: template.settings,
				filenamePattern: template.filenamePattern,
			},
		},
		null,
		2
	);

const readSettings = (value: unknown): TemplateSetting[] => {
	if (value === undefined) {
		return [];
	}
	if (!Array.isArray(value)) {
		throw new Error("Template settings must be an array");
	}
	return value.map((entry: unknown, index) => {
		if (!isRecord(entry) || typeof entry.key !== "string" || typeof entry.label !== "string" || typeof entry.default !== "string") {
			throw new Error(`Template setting ${index + 1} must have a string key, label, and default`);
		}
		return { key: entry.key, label: entry.label, default: entry.default };
	});
};

export const parseTemplateFile = (text: string, options: ParseTemplateFileOptions): Template => {
	const parsed: unknown = JSON.parse(text);
	if (!isRecord(parsed)) {
		throw new Error("The file does not contain a template object");
	}
	if (parsed.kind !== TEMPLATE_FILE_KIND) {
		throw new Error(`The file is not a ${TEMPLATE_FILE_KIND} file`);
	}
	const template = parsed.template;
	if (!isRecord(template)) {
		throw new Error("The file has no template");
	}
	if (typeof template.name !== "string" || template.name.trim() === "") {
		throw new Error("Template name must be a non-empty string");
	}
	if (!isTemplateKind(template.kind)) {
		throw new Error(`Template kind must be one of ${TEMPLATE_KINDS.join(", ")}`);
	}
	if (!isTemplateLanguage(template.language)) {
		throw new Error(`Template language must be one of ${TEMPLATE_LANGUAGES.map((language) => language.value).join(", ")}`);
	}
	if (typeof template.text !== "string") {
		throw new Error("Template text must be a string");
	}
	const filenamePattern = template.filenamePattern === undefined ? "" : template.filenamePattern;
	if (typeof filenamePattern !== "string") {
		throw new Error("Template filename pattern must be a string");
	}
	return {
		id: options.newId(),
		name: template.name,
		kind: template.kind,
		language: template.language,
		text: template.text,
		settings: readSettings(template.settings),
		filenamePattern,
		builtIn: false,
		updatedAt: options.now(),
	};
};

export const templateExportFileName = (name: string): string => `Template - ${name.trim() || "Untitled"}.json`;
