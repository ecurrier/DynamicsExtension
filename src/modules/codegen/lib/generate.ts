import { type CodegenChoice, type CodegenTable, type Template } from "@/shared/types";

import { buildChoiceView, type ChoiceView } from "./choiceView";
import { renderTemplate } from "./engine";
import { buildTableView, type TableView } from "./tableView";

export type GenerationSource = { kind: "table"; table: CodegenTable } | { kind: "choice"; choice: CodegenChoice };

export interface GenerationOptions {
	settings: Record<string, string>;
	includeSystemColumns: boolean;
}

export interface Generation {
	output: string;
	fileName: string;
	unresolved: string[];
	error: string | null;
}

const FALLBACK_EXTENSIONS: Record<Template["language"], string> = {
	csharp: "cs",
	typescript: "ts",
	javascript: "js",
};

export const settingDefaults = (template: Template): Record<string, string> =>
	Object.fromEntries(template.settings.map((setting) => [setting.key, setting.default]));

export const resolveSettings = (template: Template, overrides: Record<string, string>): Record<string, string> => ({
	...settingDefaults(template),
	...overrides,
});

export const buildView = (template: Template, source: GenerationSource, options: GenerationOptions): TableView | ChoiceView =>
	source.kind === "table"
		? buildTableView(source.table, {
				language: template.language,
				includeSystemColumns: options.includeSystemColumns,
				settings: options.settings,
			})
		: buildChoiceView(source.choice, options.settings);

const sourceName = (source: GenerationSource): string => (source.kind === "table" ? source.table.schemaName : source.choice.displayName);

export const generate = (template: Template, source: GenerationSource, options: GenerationOptions): Generation => {
	if (template.kind !== source.kind) {
		return {
			output: "",
			fileName: "",
			unresolved: [],
			error: `${template.name} is a ${template.kind} template and cannot render a ${source.kind}`,
		};
	}
	const view = buildView(template, source, options);
	const result = renderTemplate(template.text, view);
	const fileName = renderTemplate(template.filenamePattern, view).output.trim();
	return {
		output: result.output,
		fileName: fileName || `${sourceName(source)}.${FALLBACK_EXTENSIONS[template.language]}`,
		unresolved: result.unresolved,
		error: result.error,
	};
};
