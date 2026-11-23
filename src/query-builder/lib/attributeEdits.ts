import {
	attributeValue,
	type FetchXmlDocument,
	type FetchXmlEditResult,
	type NodePath,
	nodeAtPath,
	removeAttribute,
	setAttribute,
	type XmlElement,
} from "@/shared/lib/fetchxml";

import { type ChangeResult } from "./treeEdits";

export type EditStep = (document: FetchXmlDocument) => FetchXmlEditResult;

export type AttributeChanges = Readonly<Record<string, string | null>>;

export const TRUE_VALUES: readonly string[] = ["true", "1"];

export const isTrueValue = (value: string | undefined): boolean => value !== undefined && TRUE_VALUES.includes(value.trim().toLowerCase());

export const elementAtPath = (document: FetchXmlDocument, path: NodePath): XmlElement | undefined => {
	const node = nodeAtPath(document, path);
	return node?.kind === "element" ? node : undefined;
};

export const presentValue = (element: XmlElement, name: string): string | undefined => {
	const value = attributeValue(element, name)?.trim();
	return value === undefined || value === "" ? undefined : value;
};

export const runSteps = (document: FetchXmlDocument, steps: readonly EditStep[]): FetchXmlEditResult =>
	steps.reduce<FetchXmlEditResult>((result, step) => (result.ok ? step(result.document) : result), { ok: true, document });

export const attributeSteps = (path: NodePath, changes: AttributeChanges): EditStep[] =>
	Object.entries(changes).map(
		([name, value]) =>
			(document: FetchXmlDocument) =>
				value === null ? removeAttribute(document, path, name) : setAttribute(document, path, name, value)
	);

export const editAt = (document: FetchXmlDocument, path: NodePath, steps: readonly EditStep[]): ChangeResult => {
	if (!elementAtPath(document, path)) {
		return { ok: false, reason: "There is no element at that path" };
	}
	const result = runSteps(document, steps);
	if (!result.ok) {
		return result;
	}
	if (result.document === document) {
		return { ok: false, reason: "Nothing changed" };
	}
	return { ok: true, change: { document: result.document, shift: { kind: "none" }, select: path } };
};

export const setAttributes = (document: FetchXmlDocument, path: NodePath, changes: AttributeChanges): ChangeResult => {
	const element = elementAtPath(document, path);
	if (!element) {
		return { ok: false, reason: "There is no element at that path" };
	}
	const effective = Object.fromEntries(Object.entries(changes).filter(([name, value]) => (attributeValue(element, name) ?? null) !== value));
	if (Object.keys(effective).length === 0) {
		return { ok: false, reason: "Nothing changed" };
	}
	return editAt(document, path, attributeSteps(path, effective));
};

export const isAggregateQuery = (document: FetchXmlDocument): boolean =>
	document.root.name === "fetch" && isTrueValue(attributeValue(document.root, "aggregate"));

export const GROUP_BY = "groupby";

export const aggregateChoiceOf = (element: XmlElement): string | null => {
	if (isTrueValue(attributeValue(element, "groupby"))) {
		return GROUP_BY;
	}
	return presentValue(element, "aggregate") ?? null;
};

export const setAggregateChoice = (document: FetchXmlDocument, path: NodePath, choice: string | null): ChangeResult =>
	setAttributes(
		document,
		path,
		choice === GROUP_BY ? { aggregate: null, groupby: "true" } : choice === null ? { aggregate: null, groupby: null } : { aggregate: choice, groupby: null }
	);
