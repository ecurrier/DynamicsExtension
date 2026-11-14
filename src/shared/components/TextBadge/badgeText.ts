import { type ReactNode } from "react";

const collect = (node: ReactNode, parts: string[]): void => {
	if (typeof node === "string") {
		parts.push(node);
		return;
	}
	if (typeof node === "number") {
		parts.push(String(node));
		return;
	}
	if (Array.isArray(node)) {
		for (const child of node) {
			collect(child as ReactNode, parts);
		}
	}
};

/** The plain text of a badge label, used as the `title` when the label truncates. */
export const badgeText = (node: ReactNode): string | undefined => {
	const parts: string[] = [];
	collect(node, parts);
	const text = parts.join("").trim();
	return text === "" ? undefined : text;
};
