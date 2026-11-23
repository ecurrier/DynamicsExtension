import { type AttributeDefinition, attributeDefinition, attributesOf, type XmlElement } from "@/shared/lib/fetchxml";

import { isTrueValue } from "./attributeEdits";

export type DetailsEntry =
	| { readonly kind: "known"; readonly name: string; readonly definition: AttributeDefinition; readonly value: string | undefined }
	| { readonly kind: "unknown"; readonly name: string; readonly value: string };

export const detailsEntries = (element: XmlElement): readonly DetailsEntry[] => {
	const valueOf = (name: string): string | undefined => element.attributes.find((attribute) => attribute.name === name)?.value;
	const known = attributesOf(element.name)
		.filter((definition) => definition.documented || valueOf(definition.name) !== undefined)
		.map((definition): DetailsEntry => ({ kind: "known", name: definition.name, definition, value: valueOf(definition.name) }));
	const unknown = element.attributes
		.filter((attribute) => attributeDefinition(element.name, attribute.name) === undefined)
		.map((attribute): DetailsEntry => ({ kind: "unknown", name: attribute.name, value: attribute.value }));
	return [...known, ...unknown];
};

const ROW_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
	fetch: ["top", "distinct", "version", "mapping", "output-format", "paging-cookie"],
	entity: ["name"],
	attribute: ["name", "alias"],
	order: ["descending"],
	filter: ["type"],
	condition: ["attribute", "operator", "value", "valueof", "uiname", "uitype"],
	"link-entity": ["name", "from", "to", "link-type", "alias"],
};

const AGGREGATE_ROW_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
	attribute: ["aggregate", "groupby"],
	order: ["alias"],
};

const PLAIN_ROW_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
	order: ["attribute"],
};

export const rowAttributes = (elementName: string, aggregate: boolean): readonly string[] | undefined => {
	const shown = ROW_ATTRIBUTES[elementName];
	return shown ? [...shown, ...((aggregate ? AGGREGATE_ROW_ATTRIBUTES : PLAIN_ROW_ATTRIBUTES)[elementName] ?? [])] : undefined;
};

export interface RowBadge {
	readonly name: string;
	readonly text: string;
	readonly known: boolean;
}

export const rowBadges = (element: XmlElement, aggregate: boolean): readonly RowBadge[] => {
	const shown = rowAttributes(element.name, aggregate);
	if (!shown) {
		return [];
	}
	return element.attributes
		.filter((attribute) => !shown.includes(attribute.name))
		.map((attribute) => {
			const definition = attributeDefinition(element.name, attribute.name);
			const flag = definition?.value.kind === "boolean" && isTrueValue(attribute.value);
			return { name: attribute.name, text: flag ? attribute.name : `${attribute.name}=${attribute.value}`, known: definition !== undefined };
		});
};
