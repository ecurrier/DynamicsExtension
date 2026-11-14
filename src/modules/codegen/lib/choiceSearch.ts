import { type CodegenChoice } from "@/shared/types";

/** A choice is known by its display name to a maker and by its logical name to a developer. */
export const choiceMatches = (choice: CodegenChoice, term: string): boolean => {
	const text = term.trim().toLowerCase();
	if (text === "") {
		return true;
	}
	return choice.displayName.toLowerCase().includes(text) || choice.name.toLowerCase().includes(text);
};

export const choiceOptionLabel = (choice: CodegenChoice): string => (choice.displayName.trim() === "" ? choice.name : `${choice.displayName} (${choice.name})`);
