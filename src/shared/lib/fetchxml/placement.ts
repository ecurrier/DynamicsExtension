import { type FetchXmlDocument, type XmlElement, type XmlNode } from "./types";

const ENTITY_ORDER: readonly (readonly string[])[] = [["all-attributes", "attribute"], ["order"], ["filter"], ["link-entity"]];

const STANDARD_ORDER: Readonly<Record<string, readonly (readonly string[])[]>> = {
	entity: ENTITY_ORDER,
	"link-entity": ENTITY_ORDER,
	filter: [["condition"], ["filter"], ["link-entity"]],
};

type Unit = { readonly name: string | undefined; readonly start: number; readonly end: number };

export const standardChildOrder = (parent: string): readonly (readonly string[])[] => STANDARD_ORDER[parent] ?? [];

const rankOf = (parent: string, kind: string): number | undefined => {
	const rank = standardChildOrder(parent).findIndex((group) => group.includes(kind));
	return rank === -1 ? undefined : rank;
};

const unitsOf = (children: readonly XmlNode[]): Unit[] => {
	const units: Unit[] = [];
	let start = 0;
	children.forEach((child, index) => {
		if (child.kind === "element") {
			units.push({ name: child.name, start, end: index + 1 });
			start = index + 1;
		}
	});
	if (start < children.length) {
		units.push({ name: undefined, start, end: children.length });
	}
	return units;
};

export const insertionIndex = (parent: XmlElement, kind: string): number => {
	const units = unitsOf(parent.children);
	const sameKind = units.filter((unit) => unit.name === kind).at(-1);
	if (sameKind) {
		return sameKind.end;
	}
	const rank = rankOf(parent.name, kind);
	if (rank === undefined) {
		return parent.children.length;
	}
	const later = units.find((unit) => {
		const unitRank = unit.name === undefined ? undefined : rankOf(parent.name, unit.name);
		return unitRank !== undefined && unitRank > rank;
	});
	return later ? later.start : parent.children.length;
};

const regroup = (parent: XmlElement, children: readonly XmlNode[]): readonly XmlNode[] => {
	if (standardChildOrder(parent.name).length === 0) {
		return children;
	}
	const units = unitsOf(children);
	const trailing = units.filter((unit) => unit.name === undefined);
	const ranked = units
		.filter((unit) => unit.name !== undefined)
		.map((unit, position) => ({ unit, position, rank: rankOf(parent.name, unit.name ?? "") ?? Number.POSITIVE_INFINITY }))
		.sort((left, right) => left.rank - right.rank || left.position - right.position)
		.map(({ unit }) => unit);
	return [...ranked, ...trailing].flatMap((unit) => children.slice(unit.start, unit.end));
};

const sameNodes = (left: readonly XmlNode[], right: readonly XmlNode[]): boolean =>
	left.length === right.length && left.every((node, index) => node === right[index]);

const tidyElement = (element: XmlElement): XmlElement => {
	const tidied = element.children.map((child) => (child.kind === "element" ? tidyElement(child) : child));
	const children = regroup(element, tidied);
	if (sameNodes(children, element.children)) {
		return element;
	}
	if (sameNodes(children, tidied)) {
		return { ...element, children };
	}
	const { range: _range, ...rest } = element;
	return { ...rest, children };
};

export const tidy = (document: FetchXmlDocument): FetchXmlDocument => {
	const root = tidyElement(document.root);
	return root === document.root ? document : { ...document, root };
};
