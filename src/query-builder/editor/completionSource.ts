import { autocompletion, type Completion, type CompletionSource, pickedCompletion, startCompletion } from "@codemirror/autocomplete";
import { type Extension, StateEffect, StateField } from "@codemirror/state";
import { type EditorView } from "@codemirror/view";

import { type QueryMetadata } from "@/shared/lib/fetchxml";

import { completionContextAt } from "./completionContext";
import { filterCompletionItems, reopensCompletion } from "./completionFilter";
import { type CompletionItem, type CompletionOptions, completionsFor } from "./completions";

export interface XmlCompletionServices {
	readonly metadata: QueryMetadata;
	readonly options: CompletionOptions;
	readonly requestTables: (logicalNames: readonly string[]) => Promise<void>;
}

const setServices = StateEffect.define<XmlCompletionServices>();

const servicesField = StateField.define<XmlCompletionServices | null>({
	create: () => null,
	update: (value, transaction) => transaction.effects.reduce((current, effect) => (effect.is(setServices) ? effect.value : current), value),
});

export const updateXmlCompletionServices = (view: EditorView, services: XmlCompletionServices) => view.dispatch({ effects: setServices.of(services) });

const reopenLater = (view: EditorView) => {
	setTimeout(() => {
		if (view.hasFocus) {
			startCompletion(view);
		}
	});
};

const toCompletion = (item: CompletionItem): Completion => {
	const { apply } = item;
	return {
		label: item.label,
		...(item.detail ? { detail: item.detail } : {}),
		...(item.description ? { info: item.description } : {}),
		type: item.kind,
		boost: Math.max(-99, -item.rank),
		apply: apply
			? (view, completion, from, to) => {
					view.dispatch({
						changes: { from, to, insert: apply.insert },
						selection: { anchor: from + apply.cursorOffset },
						annotations: pickedCompletion.of(completion),
						userEvent: "input.complete",
					});
					if (reopensCompletion(apply)) {
						reopenLater(view);
					}
				}
			: item.value,
	};
};

const fetchXmlCompletionSource: CompletionSource = (context) => {
	const services = context.state.field(servicesField, false);
	const position = completionContextAt(context.state.doc.toString(), context.pos);
	if (!services || position.kind === "none") {
		return null;
	}
	const { metadata, options, requestTables } = services;
	const result = completionsFor(position, metadata, options);
	const { view } = context;
	if (result.pendingTables.length > 0 && view) {
		void requestTables(result.pendingTables).then(() => {
			if (completionContextAt(view.state.doc.toString(), view.state.selection.main.head).kind !== "none") {
				reopenLater(view);
			}
		});
	}
	const items = filterCompletionItems(result.items, result.typed);
	if (items.length === 0) {
		return null;
	}
	return { from: result.from, to: result.to, options: items.map(toCompletion), filter: false };
};

export const fetchXmlCompletion: Extension = [servicesField, autocompletion({ override: [fetchXmlCompletionSource], activateOnTyping: true, icons: false })];
