import { type FluentIcon, ClipboardPaste20Regular, DocumentAdd20Regular, TableSearch20Regular, Window20Regular } from "@fluentui/react-icons";

import { type ExplainerStep } from "@/shared/components";

export type StartKind = "blank" | "paste" | "view" | "page";

export interface StartingPoint {
	kind: StartKind;
	title: string;
	text: string;
	icon: FluentIcon;
}

export const STARTING_POINTS: readonly StartingPoint[] = [
	{ kind: "blank", title: "Blank", text: "Start from a Table.", icon: DocumentAdd20Regular },
	{ kind: "paste", title: "Paste Fetch XML", text: "Paste a Query into the Fetch XML editor.", icon: ClipboardPaste20Regular },
	{ kind: "view", title: "From a view", text: "Start from a System View or a Personal View.", icon: TableSearch20Regular },
	{ kind: "page", title: "From the open page", text: "Start from a grid or a subgrid on the page.", icon: Window20Regular },
];

export const QUERY_BUILDER_STEPS: ExplainerStep[] = [
	{ title: "Start", text: "Select a starting point, or paste Fetch XML." },
	{ title: "Edit", text: "Edit the Query in the tree or in the Fetch XML. The two panes show the same Query." },
	{ title: "Run", text: "Select Run or press Ctrl+Enter. The results show the first page of Records." },
];
