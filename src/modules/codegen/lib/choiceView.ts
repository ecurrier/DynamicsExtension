import { pluralName } from "@/shared/lib";
import { type CodegenChoice, type CodegenColumn, type CodegenTable } from "@/shared/types";

import { camelCase, sanitizeIdentifier } from "./identifiers";

export interface ChoiceOptionView {
	label: string;
	identifier: string;
	identifierUnderscored: string;
	value: number;
	isFirst: boolean;
	isLast: boolean;
}

export interface ChoiceInfoView {
	name: string;
	displayName: string;
	identifier: string;
	identifierCamel: string;
	identifierPlural: string;
	scope: "global" | "local";
	tableLogicalName: string | null;
	columnLogicalName: string | null;
	options: ChoiceOptionView[];
}

export interface ChoiceView {
	choice: ChoiceInfoView;
	settings: Record<string, string>;
}

export const choiceIdentifier = (displayName: string): string => sanitizeIdentifier(displayName, "");

export const optionSetDisplayName = (column: CodegenColumn): string | null =>
	column.optionSet ? (column.optionSet.isGlobal ? column.optionSet.displayName : column.displayName) : null;

export const buildChoiceView = (choice: CodegenChoice, settings: Record<string, string>): ChoiceView => {
	const identifier = choiceIdentifier(choice.displayName);
	return {
		choice: {
			name: choice.name,
			displayName: choice.displayName,
			identifier,
			identifierCamel: camelCase(identifier),
			identifierPlural: pluralName(identifier),
			scope: choice.isGlobal ? "global" : "local",
			tableLogicalName: choice.tableLogicalName,
			columnLogicalName: choice.columnLogicalName,
			options: choice.options.map((option, index) => ({
				label: option.label,
				identifier: sanitizeIdentifier(option.label, ""),
				identifierUnderscored: sanitizeIdentifier(option.label, "_"),
				value: option.value,
				isFirst: index === 0,
				isLast: index === choice.options.length - 1,
			})),
		},
		settings,
	};
};

export const localChoicesOf = (table: CodegenTable): CodegenChoice[] =>
	table.columns.flatMap((column) =>
		column.optionSet && !column.optionSet.isGlobal
			? [
					{
						name: column.optionSet.name,
						displayName: column.displayName,
						isGlobal: false,
						tableLogicalName: table.logicalName,
						columnLogicalName: column.logicalName,
						options: column.optionSet.options,
					},
				]
			: []
	);
