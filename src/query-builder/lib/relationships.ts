import { attributeValue, type FetchXmlDocument, type NodePath, type XmlElement } from "@/shared/lib/fetchxml";
import { type QueryTable, type QueryTableSummary } from "@/shared/types";

import { setAttributes } from "./attributeEdits";
import { type PickerOption } from "./pickerSearch";
import { type NamesLead } from "./rowSummary";
import { type ChangeResult } from "./treeEdits";

export type RelationshipDirection = "many-to-one" | "one-to-many";

export interface LinkRelationship {
	readonly key: string;
	readonly schemaName: string;
	readonly direction: RelationshipDirection;
	readonly name: string;
	readonly from: string;
	readonly to: string;
}

export const CUSTOM_JOIN = "custom join";

export const relationshipKey = (name: string, from: string, to: string): string => [name, from, to].map((part) => part.trim().toLowerCase()).join("|");

export const linkRelationships = (parent: QueryTable): readonly LinkRelationship[] => {
	const manyToOne = parent.manyToOne.map((relationship) => ({
		key: relationshipKey(relationship.referencedTable, relationship.referencedColumn, relationship.lookupColumn),
		schemaName: relationship.schemaName,
		direction: "many-to-one" as const,
		name: relationship.referencedTable,
		from: relationship.referencedColumn,
		to: relationship.lookupColumn,
	}));
	const oneToMany = parent.oneToMany.map((relationship) => ({
		key: relationshipKey(relationship.referencingTable, relationship.referencingColumn, relationship.referencedColumn),
		schemaName: relationship.schemaName,
		direction: "one-to-many" as const,
		name: relationship.referencingTable,
		from: relationship.referencingColumn,
		to: relationship.referencedColumn,
	}));
	const seen = new Set<string>();
	return [...manyToOne, ...oneToMany].filter((relationship) => {
		if (seen.has(relationship.key)) {
			return false;
		}
		seen.add(relationship.key);
		return true;
	});
};

export const linkKeyOf = (element: XmlElement): string =>
	relationshipKey(attributeValue(element, "name") ?? "", attributeValue(element, "from") ?? "", attributeValue(element, "to") ?? "");

export const matchingRelationship = (relationships: readonly LinkRelationship[], element: XmlElement): LinkRelationship | undefined => {
	const key = linkKeyOf(element);
	return relationships.find((relationship) => relationship.key === key);
};

const displayOf = (tables: readonly QueryTableSummary[], logicalName: string): string =>
	tables.find((table) => table.logicalName.toLowerCase() === logicalName.toLowerCase())?.displayName ?? "";

export const relationshipText = (relationship: LinkRelationship, tables: readonly QueryTableSummary[], lead: NamesLead): string => {
	const display = displayOf(tables, relationship.name);
	return lead === "display" && display !== "" ? display : relationship.name;
};

export const relationshipOptions = (relationships: readonly LinkRelationship[], tables: readonly QueryTableSummary[], lead: NamesLead): PickerOption[] =>
	relationships.map((relationship) => {
		const display = displayOf(tables, relationship.name);
		const other = lead === "display" ? relationship.name : display;
		const join = `${relationship.to} = ${relationship.name}.${relationship.from}`;
		return {
			value: relationship.key,
			text: relationshipText(relationship, tables, lead),
			secondary: [join, relationship.direction, other].filter((part) => part !== "").join(" · "),
			keys: [relationship.name, display, relationship.from, relationship.to, relationship.schemaName],
		};
	});

export const pickRelationship = (document: FetchXmlDocument, path: NodePath, relationship: LinkRelationship): ChangeResult =>
	setAttributes(document, path, { name: relationship.name, from: relationship.from, to: relationship.to });
