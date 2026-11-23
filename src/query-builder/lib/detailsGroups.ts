import {
	type AttributeGroup,
	attributeDefinition,
	type Diagnostic,
	type FetchXmlDocument,
	type NodePath,
	operatorDefinition,
	type QueryMetadata,
	type XmlElement,
} from "@/shared/lib/fetchxml";

import { isAggregateQuery, isTrueValue } from "./attributeEdits";
import { type DetailsEntry, detailsEntries } from "./detailsEntries";
import { attributeProblems } from "./rowProblems";
import { scopeColumn, tableScope } from "./rowScope";

export const DETAILS_GROUPS: readonly AttributeGroup[] = ["main", "more", "legacy"];

export type CollapsibleGroup = Exclude<AttributeGroup, "main">;

export const DETAILS_GROUP_TITLES: Readonly<Record<CollapsibleGroup, string>> = {
	more: "More options",
	legacy: "Legacy and view settings",
};

export interface AttributePlacement {
	readonly group: AttributeGroup;
	readonly required: boolean;
}

export interface PlacedEntry {
	readonly entry: DetailsEntry;
	readonly group: AttributeGroup;
	readonly optional: boolean;
	readonly covers: readonly string[];
}

export interface DetailsGroupView {
	readonly group: AttributeGroup;
	readonly entries: readonly PlacedEntry[];
	readonly setCount: number;
}

const valueOf = (element: XmlElement, name: string): string | undefined => element.attributes.find((attribute) => attribute.name === name)?.value;

const present = (element: XmlElement, name: string): boolean => (valueOf(element, name) ?? "").trim() !== "";

const isDateColumn = (document: FetchXmlDocument, path: NodePath, element: XmlElement, metadata: QueryMetadata): boolean =>
	scopeColumn(tableScope(document, path, "name", metadata), valueOf(element, "name")?.trim())?.columnType === "dateTime";

const queryRequires = (document: FetchXmlDocument, element: XmlElement, name: string): boolean => {
	const aggregate = isAggregateQuery(document);
	switch (`${element.name}.${name}`) {
		case "attribute.alias":
		case "order.alias":
			return aggregate;
		case "order.attribute":
			return !aggregate;
		case "condition.attribute":
			return true;
		case "condition.value":
			return operatorDefinition(valueOf(element, "operator")?.trim() ?? "")?.values === "one" && !present(element, "valueof");
		default:
			return false;
	}
};

const queryMovesToMain = (document: FetchXmlDocument, path: NodePath, element: XmlElement, name: string, metadata: QueryMetadata): boolean => {
	const aggregate = isAggregateQuery(document);
	switch (`${element.name}.${name}`) {
		case "attribute.aggregate":
		case "attribute.groupby":
		case "attribute.alias":
		case "order.alias":
			return aggregate;
		case "attribute.dategrouping":
			return isTrueValue(valueOf(element, "groupby")) && isDateColumn(document, path, element, metadata);
		default:
			return false;
	}
};

export const attributePlacement = (
	document: FetchXmlDocument,
	path: NodePath,
	element: XmlElement,
	name: string,
	metadata: QueryMetadata
): AttributePlacement => {
	const definition = attributeDefinition(element.name, name);
	if (!definition) {
		return { group: "legacy", required: false };
	}
	const group = queryMovesToMain(document, path, element, name, metadata) ? "main" : definition.group;
	return { group, required: definition.required || queryRequires(document, element, name) };
};

const COVERED: Readonly<Record<string, readonly string[]>> = {
	"condition.value": ["value", "valueof"],
};

const HIDDEN = new Set(["condition.valueof"]);

export const detailsGroups = (document: FetchXmlDocument, path: NodePath, element: XmlElement, metadata: QueryMetadata): readonly DetailsGroupView[] => {
	const placed = detailsEntries(element)
		.filter((entry) => !HIDDEN.has(`${element.name}.${entry.name}`))
		.map((entry): PlacedEntry => {
			const placement = attributePlacement(document, path, element, entry.name, metadata);
			return {
				entry,
				group: placement.group,
				optional: placement.group === "main" && !placement.required,
				covers: COVERED[`${element.name}.${entry.name}`] ?? [entry.name],
			};
		});
	return DETAILS_GROUPS.flatMap((group) => {
		const entries = placed.filter((each) => each.group === group);
		if (group !== "main" && entries.length === 0) {
			return [];
		}
		return [{ group, entries, setCount: entries.filter((each) => each.entry.value !== undefined).length }];
	});
};

export const entryProblems = (diagnostics: readonly Diagnostic[], path: NodePath, entry: PlacedEntry): readonly Diagnostic[] =>
	entry.covers.flatMap((name) => attributeProblems(diagnostics, path, name));

export const groupHasProblem = (diagnostics: readonly Diagnostic[], path: NodePath, view: DetailsGroupView): boolean =>
	view.entries.some((entry) => entryProblems(diagnostics, path, entry).length > 0);

export const groupHeading = (group: CollapsibleGroup, setCount: number): string =>
	setCount > 0 ? `${DETAILS_GROUP_TITLES[group]} · ${setCount} set` : DETAILS_GROUP_TITLES[group];

export const groupIsOpen = (preferred: boolean, opensByItself: boolean, closedHere: boolean): boolean => !closedHere && (preferred || opensByItself);
